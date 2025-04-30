import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CVKeywordsService } from './cv-keywords.service';
import { CVKeywordsController } from './cv-keywords.controller';
import { CVKeyword } from './cv-keyword.entity';
import { CVKeywordCategory } from './cv-keyword-category.entity';
import { Category } from './cv-category.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([CVKeyword, CVKeywordCategory, Category]),
    ConfigModule,
  ],
  providers: [CVKeywordsService],
  exports: [CVKeywordsService],
  controllers: [CVKeywordsController],
})
export class CVKeywordsModule {}
