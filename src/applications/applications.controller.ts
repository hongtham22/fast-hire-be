import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Application } from './application.entity';
import { Public } from '../auth/decorators/public.decorator';
import { SubmitApplicationDto } from './dto/submit-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  /**
   * Legacy endpoint, kept for backward compatibility
   */
  @Post('submit-cv')
  @Public()
  @UseInterceptors(FileInterceptor('cv'))
  async submitCV(
    @Body() createApplicationDto: CreateApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Application> {
    if (!file) {
      throw new BadRequestException('CV file is required');
    }

    // Get the path of the uploaded file (relative to server)
    const cvFilePath = file.path;

    return this.applicationsService.create(createApplicationDto, cvFilePath);
  }

  /**
   * New endpoint for submitting applications with applicant information
   */
  @Post('submit')
  @Public()
  @UseInterceptors(FileInterceptor('cv'))
  async submitApplication(
    @Body() submitApplicationDto: SubmitApplicationDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Application> {
    if (!file) {
      throw new BadRequestException('CV file is required');
    }

    return this.applicationsService.submitApplication(
      submitApplicationDto,
      file,
    );
  }

  @Get()
  async findAll(): Promise<Application[]> {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Application> {
    return this.applicationsService.findOne(id);
  }

  @Get('by-job/:jobId')
  @Public()
  async findByJobId(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<Application[]> {
    return this.applicationsService.findByJobId(jobId);
  }

  @Get('by-applicant/:applicantId')
  async findByApplicantId(
    @Param('applicantId', ParseUUIDPipe) applicantId: string,
  ): Promise<Application[]> {
    return this.applicationsService.findByApplicantId(applicantId);
  }

  /**
   * Delete all application records and related data
   * @param deleteApplicants Optional query param to delete applicants as well
   */
  @Delete('delete-all')
  @Public()
  // @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(
    @Query('deleteApplicants') deleteApplicants?: boolean,
  ): Promise<void> {
    return this.applicationsService.deleteAll(deleteApplicants);
  }
}
