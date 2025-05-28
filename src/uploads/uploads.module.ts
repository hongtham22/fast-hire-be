import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadsController } from './uploads.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [ConfigModule],
  controllers: [UploadsController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class UploadsModule {}
