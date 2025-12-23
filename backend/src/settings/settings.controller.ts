import { Controller, Get, Put, Body, Inject, forwardRef } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto } from './dto/settings-response.dto';
import { OllamaService } from '../services/ollama.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => OllamaService))
    private readonly ollamaService: OllamaService,
  ) {}

  @Get()
  async getSettings(): Promise<SettingsResponseDto> {
    return this.settingsService.getSettings();
  }

  @Put()
  async updateSettings(
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<SettingsResponseDto> {
    const result = await this.settingsService.updateSettings(updateSettingsDto);
    
    // Refresh cache trong OllamaService để dùng prompt mới ngay lập tức
    await this.ollamaService.refreshPromptCache();
    
    return result;
  }

  @Get('default')
  getDefaultPrompt(): { defaultPrompt: string } {
    return {
      defaultPrompt: this.settingsService.getDefaultPromptTemplate(),
    };
  }
}

