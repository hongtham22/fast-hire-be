import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpacesService } from './spaces.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post('cv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    try {
      const uploadResult = await this.spacesService.uploadFile(file, 'cvs');

      return {
        filename: file.originalname,
        key: uploadResult.key,
        url: uploadResult.url,
        path: uploadResult.url, // For backward compatibility with existing code
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }
}
