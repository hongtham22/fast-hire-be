import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Controller('uploads')
export class UploadsController {
  @Post('cv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, cb) => {
          // Format: YYYYMMDD_HHmmss-filename.ext
          const date = new Date()
            .toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/[-:]/g, '');

          const filename = file.originalname.replace(/\s+/g, '_');
          const newFilename = `${date}-${filename}`;
          cb(null, newFilename);
        },
      }),
    }),
  )
  async uploadCV(@UploadedFile() file) {
    // Return the relative path to save in the database
    return {
      filename: file.filename,
      path: `/uploads/cvs/${file.filename}`, // This path will be saved in cv_file_url
    };
  }
}
