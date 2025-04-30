import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CVKeyword } from './cv-keyword.entity';
import { CVKeywordCategory } from './cv-keyword-category.entity';
import { Category } from './cv-category.entity';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CVKeywordsService {
  private flaskApiUrl: string;

  constructor(
    @InjectRepository(CVKeyword)
    private cvKeywordRepository: Repository<CVKeyword>,
    @InjectRepository(CVKeywordCategory)
    private cvKeywordCategoryRepository: Repository<CVKeywordCategory>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private configService: ConfigService,
  ) {
    this.flaskApiUrl = this.configService.get<string>('FLASK_API_URL');
  }

  /**
   * Process a CV file and extract keywords
   * @param applicationId The ID of the application
   * @param cvFilePath Path to the CV file
   */
  async processCV(
    applicationId: string,
    cvFilePath: string,
  ): Promise<CVKeyword> {
    try {
      // Check if file exists
      if (!fs.existsSync(cvFilePath)) {
        throw new HttpException(
          `CV file not found at ${cvFilePath}`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Create form data for file upload using form-data package
      const formData = new FormData();
      const fileStream = fs.createReadStream(cvFilePath);
      const fileName = path.basename(cvFilePath);
      formData.append('cv_file', fileStream, {
        filename: fileName,
        filepath: cvFilePath,
      });

      // Call Flask API to extract keywords
      const response = await axios.post(
        `${this.flaskApiUrl}/parse-cv`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
        },
      );

      if (!response.data.success) {
        throw new HttpException(
          response.data.error || 'Failed to extract CV keywords',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create new CV keyword entry
      const cvKeyword = new CVKeyword();
      cvKeyword.applicationId = applicationId;
      cvKeyword.extractedText = response.data.raw_text;
      const savedCVKeyword = await this.cvKeywordRepository.save(cvKeyword);

      // Process and save structured data
      if (response.data.structured_data) {
        await this.saveStructuredData(
          savedCVKeyword.id,
          response.data.structured_data,
        );
      }

      return savedCVKeyword;
    } catch (error) {
      console.error('Error processing CV:', error);
      throw new HttpException(
        `Failed to process CV: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Save structured data from CV processing
   * @param cvKeywordId The ID of the CV keyword entry
   * @param structuredData The structured data from CV processing
   */
  private async saveStructuredData(
    cvKeywordId: string,
    structuredData: any,
  ): Promise<void> {
    // Process each category in the structured data
    for (const [categoryName, value] of Object.entries(structuredData)) {
      // Skip empty values
      if (!value || (Array.isArray(value) && value.length === 0)) {
        continue;
      }

      // Find or create category
      let category = await this.categoryRepository.findOne({
        where: { name: categoryName },
      });

      if (!category) {
        category = new Category();
        category.name = categoryName;
        category = await this.categoryRepository.save(category);
      }

      // Create category-keyword relation
      const cvKeywordCategory = new CVKeywordCategory();
      cvKeywordCategory.cvKeywordId = cvKeywordId;
      cvKeywordCategory.categoryId = category.id;
      cvKeywordCategory.value = value;

      await this.cvKeywordCategoryRepository.save(cvKeywordCategory);
    }
  }

  /**
   * Find CV keywords by application ID
   * @param applicationId The ID of the application
   */
  async findByApplicationId(applicationId: string): Promise<CVKeyword> {
    return this.cvKeywordRepository.findOne({
      where: { applicationId },
      relations: ['categories', 'categories.category'],
    });
  }
}
