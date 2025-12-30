import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DocumentEntity } from '../documents/entities/document.entity';
import { QAPairEntity } from '../documents/entities/qa-pair.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { Settings } from '../settings/entities/settings.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, QAPairEntity, UserEntity, Settings]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

