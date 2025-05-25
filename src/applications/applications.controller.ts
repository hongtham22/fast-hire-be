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
  Query,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { Application } from './application.entity';
import { Public } from '../auth/decorators/public.decorator';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { EvaluateApplicationDto } from './dto/evaluate-application.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  @Roles(Role.ADMIN, Role.HR)
  async findAll(): Promise<Application[]> {
    return this.applicationsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.HR)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Application> {
    return this.applicationsService.findOne(id);
  }

  @Get('by-job/:jobId')
  @Roles(Role.ADMIN, Role.HR)
  async findByJobId(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<Application[]> {
    return this.applicationsService.findByJobId(jobId);
  }

  @Get('by-applicant/:applicantId')
  @Roles(Role.ADMIN, Role.HR)
  async findByApplicantId(
    @Param('applicantId', ParseUUIDPipe) applicantId: string,
  ): Promise<Application[]> {
    return this.applicationsService.findByApplicantId(applicantId);
  }

  @Get(':jobId/applications/:applicationId')
  @Roles(Role.ADMIN, Role.HR)
  async findOneByJobAndApplication(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<Application> {
    const application =
      await this.applicationsService.findOneByJobAndApplication(
        jobId,
        applicationId,
      );

    if (!application) {
      throw new NotFoundException(
        `Application ${applicationId} not found for job ${jobId}`,
      );
    }

    return application;
  }

  /**
   * Delete all application records and related data
   * @param deleteApplicants Optional query param to delete applicants as well
   */
  @Delete('delete-all')
  @Roles(Role.ADMIN)
  // @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAll(
    @Query('deleteApplicants') deleteApplicants?: boolean,
  ): Promise<void> {
    return this.applicationsService.deleteAll(deleteApplicants);
  }

  /**
   * Delete a specific application by ID
   */
  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async deleteApplication(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.applicationsService.deleteApplication(id);
  }

  @Post(':jobId/applications/:applicationId/evaluate')
  @Roles(Role.HR)
  async evaluateApplication(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() evaluateDto: EvaluateApplicationDto,
  ): Promise<Application> {
    const application =
      await this.applicationsService.findOneByJobAndApplication(
        jobId,
        applicationId,
      );

    if (!application) {
      throw new NotFoundException(
        `Application ${applicationId} not found for job ${jobId}`,
      );
    }

    return this.applicationsService.evaluateApplication(
      applicationId,
      evaluateDto.note,
      evaluateDto.result,
    );
  }
}
