import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class SpacesService {
  private spacesEndpoint: AWS.S3;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get('DO_SPACES_ENDPOINT');
    const accessKey = this.configService.get('DO_SPACES_KEY');
    const secretKey = this.configService.get('DO_SPACES_SECRET');
    const region = this.configService.get('DO_SPACES_REGION');
    this.bucketName = this.configService.get('DO_SPACES_BUCKET');

    this.spacesEndpoint = new AWS.S3({
      endpoint: new AWS.Endpoint(endpoint),
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      region: region,
      s3ForcePathStyle: true,
      sslEnabled: true,
      s3BucketEndpoint: false,
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'cvs',
  ): Promise<{ key: string; url: string }> {
    const uniqueSuffix = uuidv4();
    const ext = extname(file.originalname);
    const key = `${folder}/${uniqueSuffix}${ext}`;

    const uploadParams = {
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ACL: 'public-read',
      ContentType: file.mimetype,
    };

    try {
      const result = await this.spacesEndpoint.upload(uploadParams).promise();
      console.log('Upload successful:', {
        Location: result.Location,
        ETag: result.ETag,
        Bucket: result.Bucket,
        Key: result.Key,
      });

      const fileUrl = this.getFileUrl(key);

      console.log('Generated file URL:', fileUrl);

      return {
        key: key,
        url: fileUrl,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload file to DigitalOcean Spaces: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async deleteFile(key: string): Promise<void> {
    const deleteParams = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      await this.spacesEndpoint.deleteObject(deleteParams).promise();
    } catch (error) {
      throw new Error(
        `Failed to delete file from DigitalOcean Spaces: ${error.message}`,
      );
    }
  }

  getFileUrl(key: string): string {
    const endpoint = this.configService.get('DO_SPACES_ENDPOINT');
    const bucketName = this.configService.get('DO_SPACES_BUCKET');
    return `${endpoint}/${bucketName}/${key}`;
  }
}
