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
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
// import { UserRole } from '../users/user-role.enum';
import { JobStatus } from './job.entity';
import axios from 'axios';

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
}
