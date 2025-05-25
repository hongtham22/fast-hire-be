import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { CVKeywordsService } from './cv-keywords.service';
import { Role } from '@/users/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';

@Controller('cv-keywords')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CVKeywordsController {
  private readonly logger = new Logger(CVKeywordsController.name);

  constructor(private readonly cvKeywordsService: CVKeywordsService) {}

  @Get('by-application/:applicationId')
  @Roles(Role.ADMIN, Role.HR)
  async findByApplicationId(@Param('applicationId') applicationId: string) {
    try {
      const cvKeyword =
        await this.cvKeywordsService.findByApplicationId(applicationId);

      if (!cvKeyword) {
        this.logger.warn(
          `CV keywords for application ID ${applicationId} not found`,
        );
        throw new NotFoundException(
          `CV keywords for application ID ${applicationId} not found`,
        );
      }

      // Format the response to match the structure expected by the frontend
      const result = {
        raw_text: cvKeyword.extractedText || '',
        structured_data: {},
      };

      // Process categories and their values
      if (cvKeyword.categories && cvKeyword.categories.length > 0) {
        for (const category of cvKeyword.categories) {
          if (category.category && category.category.name) {
            result.structured_data[category.category.name] =
              category.value || null;
          }
        }
      }

      this.logger.debug(
        `Successfully retrieved CV keywords for application ID ${applicationId}`,
      );
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error retrieving CV keywords: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
