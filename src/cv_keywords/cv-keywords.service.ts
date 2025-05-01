import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CVKeyword } from './cv-keyword.entity';
import { CVKeywordCategory } from './cv-keyword-category.entity';
import { CVCategory } from './cv-category.entity';
import { Application } from '../applications/application.entity';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { ConfigService } from '@nestjs/config';
import { JdKeywordsService } from '../jd_keywords/jd-keywords.service';

@Injectable()
export class CVKeywordsService {
  private flaskApiUrl: string;

  constructor(
    @InjectRepository(CVKeyword)
    private cvKeywordRepository: Repository<CVKeyword>,
    @InjectRepository(CVKeywordCategory)
    private cvKeywordCategoryRepository: Repository<CVKeywordCategory>,
    @InjectRepository(CVCategory)
    private categoryRepository: Repository<CVCategory>,
    @InjectRepository(Application)
    private applicationRepository: Repository<Application>,
    private configService: ConfigService,
    private jdKeywordsService: JdKeywordsService,
  ) {
    this.flaskApiUrl = this.configService.get<string>('FLASK_API_URL');
  }

  /**
   * Process a CV file and match it against a job's keywords
   */
  async processCV(
    applicationId: string,
    cvFilePath: string,
    jobId: string,
  ): Promise<CVKeyword> {
    try {
      if (!fs.existsSync(cvFilePath)) {
        throw new HttpException(`CV file not found`, HttpStatus.NOT_FOUND);
      }

      console.log(
        `Processing CV for application ${applicationId}, job ${jobId}`,
      );

      // Prepare and send request to Flask API
      const response = await this.sendMatchingRequest(cvFilePath, jobId);

      // Create CV keyword record and update application with response data
      return this.saveMatchingResult(applicationId, response);
    } catch (error) {
      console.error('Error processing CV:', error);
      return this.handleCVProcessingError(applicationId, error);
    }
  }

  /**
   * Send CV matching request to Flask API
   */
  private async sendMatchingRequest(cvFilePath: string, jobId: string) {
    // Prepare form-data for Flask
    const formData = new FormData();
    formData.append('cv_file', fs.createReadStream(cvFilePath), {
      filename: path.basename(cvFilePath),
      filepath: cvFilePath,
    });

    const jdKeywords = await this.getJobKeywords(jobId);
    if (!jdKeywords) {
      console.warn(`No JD keywords found for job ${jobId}, using empty object`);
      // Instead of throwing an error, use an empty object to continue the process
      formData.append('job_id', jobId);
      formData.append('jd_keywords', JSON.stringify({}));
    } else {
      formData.append('job_id', jobId);
      formData.append('jd_keywords', JSON.stringify(jdKeywords));
    }

    console.log(
      `Sending request to Flask API: ${this.flaskApiUrl}/match-cv-jd`,
    );

    const { data } = await axios.post(
      `${this.flaskApiUrl}/match-cv-jd`,
      formData,
      { headers: formData.getHeaders() },
    );

    console.log(`Received response from Flask API`, {
      data,
    });

    return data;
  }

  /**
   * Save matching results to database
   */
  private async saveMatchingResult(
    applicationId: string,
    data: any,
  ): Promise<CVKeyword> {
    // Create CVKeyword record with fallback for empty data
    const cvKeyword = this.cvKeywordRepository.create({
      applicationId,
      extractedText: data.raw_text || 'Nothing',
    });

    const savedCVKeyword = await this.cvKeywordRepository.save(cvKeyword);
    console.log(`Saved CV keyword with ID ${savedCVKeyword.id}`);

    // Update application with matching data
    await this.applicationRepository.update(applicationId, {
      matchingScore: data.matching_score || 0,
      missingFeedback: data.missing_feedback || 'No feedback available',
    });
    console.log(
      `Updated application ${applicationId} with matching score and feedback`,
    );

    // Save structured keyword data if available
    if (data.cv_keywords) {
      await this.saveStructuredData(savedCVKeyword.id, data.cv_keywords);
      console.log(`Saved structured CV data for application ${applicationId}`);
    } else {
      console.warn(
        `No structured CV data received for application ${applicationId}`,
      );
    }

    return savedCVKeyword;
  }

  /**
   * Handle errors during CV processing by creating fallback records
   */
  private async handleCVProcessingError(
    applicationId: string,
    error: any,
  ): Promise<CVKeyword> {
    try {
      const fallbackKeyword = this.cvKeywordRepository.create({
        applicationId,
        extractedText: 'Failed to extract text',
      });

      const savedFallback =
        await this.cvKeywordRepository.save(fallbackKeyword);

      // Update application with fallback values
      await this.applicationRepository.update(applicationId, {
        matchingScore: 0,
        missingFeedback: `Error processing CV: ${error.message}`,
      });

      console.log(
        `Created fallback CV keyword record for application ${applicationId}`,
      );
      return savedFallback;
    } catch (fallbackError) {
      console.error('Failed to create fallback CV keyword:', fallbackError);
      throw new HttpException(
        `Failed to process CV: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Save structured CV data to the database
   */
  private async saveStructuredData(
    cvKeywordId: string,
    structuredData: Record<string, any>,
  ): Promise<void> {
    for (const [categoryName, value] of Object.entries(structuredData)) {
      if (!value || (Array.isArray(value) && value.length === 0)) continue;

      try {
        let category = await this.categoryRepository.findOne({
          where: { name: categoryName },
        });
        if (!category) {
          category = this.categoryRepository.create({ name: categoryName });
          category = await this.categoryRepository.save(category);
          console.log(`Created new category: ${categoryName}`);
        }

        const cvKeywordCategory = this.cvKeywordCategoryRepository.create({
          cvKeywordId,
          categoryId: category.id,
          value,
        });

        await this.cvKeywordCategoryRepository.save(cvKeywordCategory);
        console.log(`Saved CV keyword category: ${categoryName}`);
      } catch (error) {
        console.error(
          `Error saving structured data for category ${categoryName}:`,
          error,
        );
        // Continue with other categories even if one fails
      }
    }
  }

  /**
   * Find CV keywords by application ID
   */
  async findByApplicationId(applicationId: string): Promise<CVKeyword | null> {
    return this.cvKeywordRepository.findOne({
      where: { applicationId },
      relations: ['categories', 'categories.category'],
    });
  }

  /**
   * Get job keywords from the job keywords service
   */
  private async getJobKeywords(jobId: string): Promise<any> {
    try {
      const keywords = await this.jdKeywordsService.getKeywordsByJobId(jobId);
      return keywords || {};
    } catch (error) {
      console.error('Error fetching JD keywords:', error);
      return {};
    }
  }
}
