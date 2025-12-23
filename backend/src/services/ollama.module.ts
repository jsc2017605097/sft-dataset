import { Module } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule], // Import SettingsModule để inject SettingsService
  providers: [OllamaService],
  exports: [OllamaService], // Export để các module khác có thể dùng
})
export class OllamaModule {}


