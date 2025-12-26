import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TikaService } from './services/tika.service';
import { OllamaService } from './services/ollama.service';
import { Public } from './auth/public.decorator';

/**
 * App Controller - Health check và system info
 */
@Controller()
export class AppController {
  constructor(
    private readonly tikaService: TikaService,
    private readonly ollamaService: OllamaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * GET /api/health
   * Health check endpoint - Kiểm tra server và các services
   * Note: Không cần 'api' prefix vì đã có global prefix trong main.ts
   * Public endpoint - không cần authentication
   */
  @Public()
  @Get('health')
  async getHealth() {
    const tikaEndpoint = this.configService.get<string>('TIKA_ENDPOINT') || 'http://localhost:9998/tika';
    const ollamaEndpoint = this.configService.get<string>('OLLAMA_ENDPOINT') || 'http://localhost:11434/api/generate';
    const ollamaModel = this.configService.get<string>('OLLAMA_MODEL') || 'ubkt:latest';

    // Kiểm tra Tika service
    let tikaStatus = 'error';
    let tikaError = '';
    try {
      const response = await fetch(tikaEndpoint, {
        method: 'PUT',
        headers: { 'Accept': 'text/plain' },
        body: new Uint8Array([0]), // Empty test request
      });
      tikaStatus = response.ok ? 'ok' : 'error';
      if (!response.ok) {
        tikaError = `${response.status} ${response.statusText}`;
      }
    } catch (error) {
      tikaError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Kiểm tra Ollama service
    let ollamaStatus = 'error';
    let ollamaError = '';
    try {
      const response = await fetch(ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: 'test',
          stream: false,
        }),
      });
      ollamaStatus = response.ok ? 'ok' : 'error';
      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        ollamaError = `${response.status} ${response.statusText}${errorText ? ': ' + errorText : ''}`;
      }
    } catch (error) {
      ollamaError = error instanceof Error ? error.message : 'Unknown error';
    }

    return {
      status: 'ok',
      services: {
        tika: {
          status: tikaStatus,
          endpoint: tikaEndpoint,
          error: tikaError || undefined,
        },
        ollama: {
          status: ollamaStatus,
          endpoint: ollamaEndpoint,
          model: ollamaModel,
          error: ollamaError || undefined,
        },
      },
    };
  }
}

