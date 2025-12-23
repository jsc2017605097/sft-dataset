import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponseDto } from './dto/settings-response.dto';

@Injectable()
export class SettingsService {
  // Default prompt template - HARD-CODED, không bao giờ mất
  readonly DEFAULT_PROMPT_TEMPLATE = `Bạn là một chuyên gia pháp luật. Nhiệm vụ của bạn là tạo các cặp câu hỏi và câu trả lời (Q&A) từ tài liệu pháp luật được cung cấp.

QUAN TRỌNG - BẮT BUỘC:
1. Ngôn ngữ: Tiếng Việt trang trọng, chính xác về mặt pháp lý
2. Nội dung: Câu hỏi phải là những gì người dùng thường hỏi về luật, câu trả lời phải chi tiết và trích dẫn logic từ tài liệu`;

  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  /**
   * Get current settings (hoặc tạo mới nếu chưa có)
   */
  async getSettings(): Promise<SettingsResponseDto> {
    let settings = await this.settingsRepository.findOne({ where: { id: 1 } });

    // Nếu chưa có settings, tạo mới với default
    if (!settings) {
      settings = this.settingsRepository.create({
        useDefaultPrompt: true,
        customPrompt: null,
        updatedAt: new Date(),
      });
      await this.settingsRepository.save(settings);
    }

    return {
      useDefaultPrompt: settings.useDefaultPrompt,
      customPrompt: settings.customPrompt,
      defaultPromptTemplate: this.DEFAULT_PROMPT_TEMPLATE,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Update settings
   */
  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    let settings = await this.settingsRepository.findOne({ where: { id: 1 } });

    if (!settings) {
      settings = this.settingsRepository.create({
        useDefaultPrompt: dto.useDefaultPrompt,
        customPrompt: dto.customPrompt,
        updatedAt: new Date(),
      });
    } else {
      settings.useDefaultPrompt = dto.useDefaultPrompt;
      settings.customPrompt = dto.customPrompt;
      settings.updatedAt = new Date();
    }

    await this.settingsRepository.save(settings);

    return {
      useDefaultPrompt: settings.useDefaultPrompt,
      customPrompt: settings.customPrompt,
      defaultPromptTemplate: this.DEFAULT_PROMPT_TEMPLATE,
      updatedAt: settings.updatedAt,
    };
  }

  /**
   * Get system prompt cho Ollama (cache sẽ dùng method này)
   */
  async getSystemPrompt(): Promise<string> {
    const settings = await this.getSettings();

    if (settings.useDefaultPrompt) {
      return this.DEFAULT_PROMPT_TEMPLATE;
    }

    return settings.customPrompt || this.DEFAULT_PROMPT_TEMPLATE;
  }

  /**
   * Get default prompt template (để FE hiển thị)
   */
  getDefaultPromptTemplate(): string {
    return this.DEFAULT_PROMPT_TEMPLATE;
  }
}

