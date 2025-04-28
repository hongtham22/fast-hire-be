import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  ParseUUIDPipe,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Public } from '../auth/decorators/public.decorator';

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

  @Get(':id')
  @Public()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.jobsService.findOne(id);
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }
}
