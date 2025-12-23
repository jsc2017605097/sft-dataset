import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { Settings } from './entities/settings.entity';
import { OllamaModule } from '../services/ollama.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Settings]),
    forwardRef(() => OllamaModule), // forwardRef để tránh circular dependency
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService], // Export để OllamaService có thể inject
})
export class SettingsModule {}

