import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  Param,
  NotFoundException,
  UseGuards,
  Post,
  Body,
  Delete,
  Put,
  Request,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '../users/user-role.enum';
import { JobStatus } from './job.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Role } from '../users/enums/role.enum';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Public()
  test() {
    return { message: 'Jobs API is working!' };
  }

  @Get('open')
  @Public()
  async findOpenJobs(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('locationId', new ParseUUIDPipe({ optional: true }))
    locationId?: string,
    @Query('query') query?: string,
  ) {
    return this.jobsService.findOpenJobs({
      page,
      limit,
      locationId,
      query,
    });
  }

  @Get('hr/all')
  @Roles(Role.HR)
  async findAllJobsForHR(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: JobStatus,
    @Query('query') query?: string,
    @Request() req?: any,
  ) {
    return this.jobsService.findAllJobsForHR({
      page,
      limit,
      status,
      query,
      userId: req.user.id,
    });
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  async findAllJobsForAdmin(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: JobStatus,
    @Query('query') query?: string,
  ) {
    return this.jobsService.findAllJobsForAdmin({
      page,
      limit,
      status,
      query,
    });
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobsService.findOne(id);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  @Get(':id/keywords')
  @Roles(Role.ADMIN, Role.HR)
  async getJobKeywords(@Param('id', ParseUUIDPipe) id: string) {
    const keywords = await this.jobsService.getJDKeywords(id);
    if (!keywords) {
      throw new NotFoundException(`Keywords for job ID ${id} not found`);
    }
    return keywords;
  }

  @Post('create-with-keywords')
  @Roles(Role.ADMIN, Role.HR)
  async createJobWithKeywords(
    @Body() createJobDto: CreateJobDto,
    @Request() req,
  ) {
    // First create the job with authenticated user
    const job = await this.jobsService.createWithAuthenticatedUser(
      createJobDto,
      req.user.id,
    );

    // Then extract and store keywords
    await this.jobsService.extractAndStoreJDKeywords(job.id);

    return job;
  }

  @Post(':id/extract-keywords')
  @Roles(Role.ADMIN, Role.HR)
  async extractJobKeywords(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.extractAndStoreJDKeywords(id);
  }

  @Post('process-all-keywords')
  @Roles(Role.ADMIN, Role.HR)
  async processAllJobKeywords() {
    return this.jobsService.processAllJobsForKeywords();
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.HR)
  async deleteJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.deleteJobWithKeywords(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.HR)
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    const job = await this.jobsService.update(id, updateJobDto);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  /**
   * Close a job
   * @param id Job ID
   * @param body Body with close reason
   * @returns The closed job
   */
  @Post(':id/close')
  @Roles(Role.ADMIN, Role.HR)
  async closeJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { closeReason: 'manual' | 'expired' },
  ) {
    return this.jobsService.closeJob(id, body.closeReason || 'manual');
  }
}
