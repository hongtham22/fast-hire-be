import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JdKeywordsService } from './jd-keywords.service';
import { JDKeyword } from './jd-keyword.entity';
import { JDKeywordCategory } from './jd-keyword-category.entity';
import { JDCategory } from './jd-category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JDKeyword, JDKeywordCategory, JDCategory]),
  ],
  providers: [JdKeywordsService],
  exports: [JdKeywordsService],
})
export class JdKeywordsModule {}
