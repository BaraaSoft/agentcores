import { Controller, Get, Header, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { JobsApiService } from './jobs-api.service';

/**
 * What a Job left on the screen.
 */
@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsApiService) {}

  @Get(':id/screenshot')
  @ApiOperation({ summary: 'The final screen of the last Task in the Job that has one, as a PNG' })
  @ApiProduces('image/png')
  @ApiOkResponse({ description: 'The PNG image' })
  @ApiNotFoundResponse({ description: 'The Job has no screenshot, or it was already deleted' })
  @Header('Cache-Control', 'no-store')
  async getJobScreenshot(@Param('id', ParseUUIDPipe) jobId: string): Promise<StreamableFile> {
    return new StreamableFile(await this.jobs.getJobScreenshot(jobId), { type: 'image/png' });
  }
}
