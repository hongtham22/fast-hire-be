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

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Public()
  test() {
    return { message: 'Jobs API is working!' };
  }

  @Get('open')
  @Public() // Mark this endpoint as public
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
  @Public() // Mark this endpoint as public

  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.HR, UserRole.ADMIN)
  async findAllJobsForHR(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('status') status?: JobStatus,
    @Query('query') query?: string,
  ) {
    return this.jobsService.findAllJobsForHR({
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
  @Public()
  async getJobKeywords(@Param('id', ParseUUIDPipe) id: string) {
    const keywords = await this.jobsService.getJDKeywords(id);
    if (!keywords) {
      throw new NotFoundException(`Keywords for job ID ${id} not found`);
    }
    return keywords;
  }

  @Post('create-with-keywords')
  @Public() // For testing purposes, consider adding proper auth guards
  async createJobWithKeywords(@Body() createJobDto: CreateJobDto) {
    // First create the job with default HR user
    const job = await this.jobsService.createWithDefaultHR(createJobDto);

    // Then extract and store keywords
    await this.jobsService.extractAndStoreJDKeywords(job.id);

    return job;
  }

  @Post(':id/extract-keywords')
  @Public() // For testing purposes, consider adding proper auth guards
  async extractJobKeywords(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.extractAndStoreJDKeywords(id);
  }

  @Post('process-all-keywords')
  @Public() // For testing purposes, consider adding proper auth guards
  async processAllJobKeywords() {
    return this.jobsService.processAllJobsForKeywords();
  }

  @Delete(':id')
  @Public() // For testing purposes, consider adding proper auth guards later
  async deleteJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.deleteJobWithKeywords(id);
  }

  @Put(':id')
  @Public() // For testing purposes, consider adding proper auth guards later
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
}
