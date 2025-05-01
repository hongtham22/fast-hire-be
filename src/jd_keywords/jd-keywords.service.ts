import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JDKeyword } from './jd-keyword.entity';
import { JDKeywordCategory } from './jd-keyword-category.entity';
import { JDCategory } from './jd-category.entity';

@Injectable()
export class JdKeywordsService {
  constructor(
    @InjectRepository(JDKeyword)
    private jdKeywordRepository: Repository<JDKeyword>,
    @InjectRepository(JDKeywordCategory)
    private jdKeywordCategoryRepository: Repository<JDKeywordCategory>,
    @InjectRepository(JDCategory)
    private jdCategoryRepository: Repository<JDCategory>,
  ) {}

  /**
   * Get all keywords for a specific job ID
   * @param jobId The job ID to get keywords for
   */
  async getKeywordsByJobId(jobId: string): Promise<any> {
    try {
      // Find all keywords related to this job ID
      const keywords = await this.jdKeywordRepository.find({
        where: { jobId },
        relations: ['categories', 'categories.category'],
      });

      if (!keywords || keywords.length === 0) {
        console.warn(`No JD keywords found for job ID: ${jobId}`);
        return null;
      }

      // Format the keywords in the structure expected by the Flask API
      const result = {};

      // Process all categories from all keywords
      for (const keyword of keywords) {
        if (keyword.categories && keyword.categories.length > 0) {
          for (const categoryRelation of keyword.categories) {
            const categoryName = categoryRelation.category.name;
            const value = categoryRelation.value;

            // Initialize the category array if it doesn't exist
            if (!result[categoryName]) {
              result[categoryName] = [];
            }

            // Just add the value directly to the category
            if (Array.isArray(value)) {
              // If value is an array, push all items
              result[categoryName] = [...result[categoryName], ...value];
            } else if (value !== null && value !== undefined) {
              // If value is not null or undefined, add it
              result[categoryName].push(value);
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.error(`Error getting keywords for job ID ${jobId}:`, error);
      throw new HttpException(
        `Failed to get job keywords: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
