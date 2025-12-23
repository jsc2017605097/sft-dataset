import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneratedQA } from '../common/interfaces/frontend-types';
import { SettingsService } from '../settings/settings.service';

/**
 * Ollama Service - Generate Q&A pairs từ text
 * Gọi Ollama LLM để tạo các cặp câu hỏi và câu trả lời từ văn bản
 */
@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly ollamaEndpoint: string;
  private readonly defaultModel: string;
  private cachedSystemPrompt: string; // Cache system prompt từ DB

  constructor(
    private readonly configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.ollamaEndpoint = this.configService.get<string>('OLLAMA_ENDPOINT') || 'http://localhost:11434/api/generate';
    this.defaultModel = this.configService.get<string>('OLLAMA_MODEL') || 'ubkt:latest';
  }

  /**
   * Load system prompt từ DB khi server start và cache lại
   */
  async onModuleInit() {
    console.log('[OllamaService] Loading system prompt from database...');
    this.cachedSystemPrompt = await this.settingsService.getSystemPrompt();
    console.log('[OllamaService] System prompt cached:', this.cachedSystemPrompt.substring(0, 100) + '...');
  }

  /**
   * Refresh cache khi user update settings
   */
  async refreshPromptCache() {
    console.log('[OllamaService] Refreshing system prompt cache...');
    this.cachedSystemPrompt = await this.settingsService.getSystemPrompt();
    console.log('[OllamaService] System prompt cache refreshed');
  }

  /**
   * Tách text dài thành nhiều chunk nhỏ hơn để gửi cho Ollama
   * Ưu tiên tách theo đoạn (line break), sau đó theo câu
   * @param text - Văn bản đầy đủ từ Tika
   * @param maxLen - Độ dài tối đa mỗi chunk
   */
  private splitTextIntoChunks(text: string, maxLen = 3000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n{2,}/); // tách theo đoạn trống

    let current = '';

    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (!trimmed) continue;

      // Nếu đoạn nhỏ hơn maxLen, thử ghép vào current
      if ((current + '\n\n' + trimmed).length <= maxLen) {
        current = current ? current + '\n\n' + trimmed : trimmed;
      } else if (trimmed.length <= maxLen) {
        // Đoạn riêng lẻ <= maxLen nhưng current + đoạn > maxLen → push current, tạo chunk mới
        if (current) {
          chunks.push(current);
        }
        current = trimmed;
      } else {
        // Đoạn quá dài, tách theo câu
        const sentences = trimmed.split(/(?<=[\.!\?])\s+/);
        for (const sentence of sentences) {
          const sTrim = sentence.trim();
          if (!sTrim) continue;
          if ((current + ' ' + sTrim).length <= maxLen) {
            current = current ? current + ' ' + sTrim : sTrim;
          } else {
            if (current) {
              chunks.push(current);
            }
            // Nếu câu vẫn > maxLen, cắt thẳng tay theo substring
            if (sTrim.length > maxLen) {
              for (let i = 0; i < sTrim.length; i += maxLen) {
                chunks.push(sTrim.slice(i, i + maxLen));
              }
              current = '';
            } else {
              current = sTrim;
            }
          }
        }
      }
    }

    if (current) {
      chunks.push(current);
    }

    // Fallback: nếu vì lý do nào đó không tạo được chunk, trả về full text rút gọn
    if (chunks.length === 0 && text.trim().length > 0) {
      return [text.substring(0, maxLen)];
    }

    return chunks;
  }

  /**
   * Kiểm tra xem 2 câu hỏi có trùng lặp không (exact match hoặc substring match)
   * @param q1 - Câu hỏi 1
   * @param q2 - Câu hỏi 2
   * @returns true nếu trùng lặp, false nếu không
   */
  private isDuplicateQuestion(q1: string, q2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
    const n1 = normalize(q1);
    const n2 = normalize(q2);
    
    // Exact match (sau khi normalize)
    if (n1 === n2) {
      return true;
    }
    
    // Substring match: nếu một câu là substring của câu kia (và độ dài chênh lệch < 30%)
    const len1 = n1.length;
    const len2 = n2.length;
    const minLen = Math.min(len1, len2);
    const maxLen = Math.max(len1, len2);
    
    // Nếu chênh lệch quá lớn (> 30%), không coi là duplicate
    if (maxLen - minLen > maxLen * 0.3) {
      return false;
    }
    
    // Kiểm tra substring
    if (n1.includes(n2) || n2.includes(n1)) {
      return true;
    }
    
    return false;
  }

  /**
   * Lọc các Q&A pairs trùng lặp so với danh sách đã có
   * @param newPairs - Q&A pairs mới từ Ollama
   * @param existingPairs - Q&A pairs đã có
   * @returns Q&A pairs không trùng lặp
   */
  private filterDuplicates(
    newPairs: GeneratedQA[],
    existingPairs: GeneratedQA[],
  ): GeneratedQA[] {
    return newPairs.filter((newPair) => {
      // Kiểm tra với tất cả các câu hỏi đã có
      return !existingPairs.some((existing) => {
        return this.isDuplicateQuestion(newPair.question, existing.question);
      });
    });
  }

  /**
   * Gọi Ollama một lần để generate Q&A pairs
   * @param text - Văn bản đã được extract từ Tika
   * @param count - Số lượng Q&A pairs cần tạo
   * @param existingQuestions - Danh sách câu hỏi đã có (để tránh trùng lặp)
   * @returns Mảng các Q&A pairs với format {question, answer}
   */
  private async callOllamaOnce(
    chunkText: string,
    count: number,
    existingQuestions: string[] = [],
  ): Promise<GeneratedQA[]> {
    try {
      // Tạo system prompt từ cache (user configurable) + technical format (fix cứng)
      let systemPrompt = this.cachedSystemPrompt; // User configurable part
      
      // Append technical format rules (FIX CỨNG - không cho user edit)
      systemPrompt += `
3. Format: BẮT BUỘC phải trả về JSON array với format chính xác:
   [
     {"question": "Câu hỏi 1", "answer": "Câu trả lời 1"},
     {"question": "Câu hỏi 2", "answer": "Câu trả lời 2"}
   ]
4. Số lượng: Tạo chính xác ${count} cặp Q&A`;

      // Nếu đã có câu hỏi trước đó, chỉ lấy 15 câu gần nhất để tránh context quá dài
      if (existingQuestions.length > 0) {
        const recentQuestions = existingQuestions.slice(-15); // Chỉ lấy 15 câu gần nhất
        systemPrompt += `\n5. TRÁNH TRÙNG LẶP: Đã có ${existingQuestions.length} câu hỏi. Dưới đây là ${recentQuestions.length} câu gần nhất - BẠN PHẢI tạo câu hỏi MỚI, HOÀN TOÀN KHÁC về nội dung và ngữ nghĩa:
${recentQuestions.map((q, idx) => `   ${idx + 1}. ${q}`).join('\n')}`;
      } else {
        systemPrompt += `\n5. KHÔNG được trả về object với numeric keys như {"0": "...", "1": "..."}`;
      }

      systemPrompt += `
6. KHÔNG được trả về chỉ answers, PHẢI có cả question và answer
7. Chỉ trả về JSON array, KHÔNG có text thêm, KHÔNG có markdown, KHÔNG có giải thích

VÍ DỤ ĐÚNG:
[
  {"question": "Tội phạm là gì?", "answer": "Tội phạm là hành vi nguy hiểm cho xã hội..."},
  {"question": "Độ tuổi chịu trách nhiệm hình sự?", "answer": "Người từ đủ 16 tuổi..."}
]

VÍ DỤ SAI (KHÔNG ĐƯỢC):
{"0": "answer 1", "1": "answer 2"}  ← SAI
{"question": "..."}  ← SAI (thiếu answer hoặc không phải array)
"text plain"  ← SAI`;

      // Giới hạn chunk text để tránh context quá dài (3000 chars thay vì 8000)
      const maxChunkInPrompt = 3000;
      let userPrompt = `Dựa trên phần tài liệu pháp luật sau đây, hãy tạo CHÍNH XÁC ${count} cặp câu hỏi và câu trả lời MỚI (không trùng với các câu đã có):

${chunkText.substring(0, maxChunkInPrompt)}${chunkText.length > maxChunkInPrompt ? '...' : ''}

NHỚ: Trả về JSON array format: [{"question": "...", "answer": "..."}, ...] - KHÔNG có gì khác ngoài JSON array.`;

      // Gọi Ollama API với /api/generate endpoint
      const requestBody = {
        model: this.defaultModel,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        format: 'json', // Yêu cầu Ollama trả về JSON
      };

      console.log(`[Ollama] Calling endpoint: ${this.ollamaEndpoint}`);
      console.log(`[Ollama] Model: ${this.defaultModel}`);
      console.log(`[Ollama] Prompt length: ${requestBody.prompt.length} chars (system: ${systemPrompt.length}, user: ${userPrompt.length})`);
      
      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[Ollama] Error response (${response.status}): ${errorText}`);
        
        // Nếu 404, có thể endpoint không đúng hoặc model không tồn tại
        if (response.status === 404) {
          throw new HttpException(
            `Ollama endpoint không tìm thấy (404). Kiểm tra: 1) Ollama server có đang chạy tại ${this.ollamaEndpoint}? 2) Model "${this.defaultModel}" có tồn tại? 3) Endpoint có đúng không?`,
            HttpStatus.BAD_GATEWAY,
          );
        }
        
        throw new HttpException(
          `Ollama API error: ${response.status} ${response.statusText}. Endpoint: ${this.ollamaEndpoint}. Model: ${this.defaultModel}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      // Log metadata ngắn gọn (không log toàn bộ tokens array - có thể rất dài)
      const metadata = {
        model: data.model,
        created_at: data.created_at,
        total_duration: data.total_duration ? `${(data.total_duration / 1000000000).toFixed(2)}s` : undefined,
        prompt_eval_count: data.prompt_eval_count,
        eval_count: data.eval_count,
        done: data.done,
      };
      console.log('[Ollama] Response metadata:', JSON.stringify(metadata, null, 2));

      // Ollama response format: { response: "..." } hoặc có thể là array trực tiếp
      let responseText = '';
      if (data.response) {
        responseText = data.response;
        console.log('[Ollama] Response text length:', responseText.length, 'chars');
      } else if (Array.isArray(data)) {
        // Nếu response là array trực tiếp, return luôn
        const validPairs = data.filter(
          (item) => item && typeof item.question === 'string' && typeof item.answer === 'string',
        );
        if (validPairs.length > 0) {
          return validPairs;
        }
        throw new HttpException(
          'Ollama trả về array nhưng không có Q&A pair hợp lệ',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      } else if (typeof data === 'string') {
        responseText = data;
      } else {
        console.error('[Ollama] Unexpected response format:', data);
        throw new HttpException(
          `Ollama response format không hợp lệ. Expected: { response: "..." } or array. Got: ${typeof data}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Parse JSON từ response text
      // Có thể response chứa markdown code block, cần clean
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // Chỉ log preview, không log toàn bộ (có thể rất dài)
      console.log('[Ollama] Cleaned text preview (first 300 chars):', cleanedText.substring(0, 300) + '...');

      let qaPairs: GeneratedQA[];
      try {
        qaPairs = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error('[Ollama] JSON parse error:', parseError);
        console.error('[Ollama] Text that failed to parse:', cleanedText.substring(0, 1000));
        
        // Nếu parse thất bại, thử extract JSON từ text
        const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            qaPairs = JSON.parse(jsonMatch[0]);
            console.log('[Ollama] Successfully parsed extracted JSON');
          } catch (extractError) {
            console.error('[Ollama] Extracted JSON also failed to parse:', extractError);
            throw new HttpException(
              `Không thể parse JSON từ Ollama response. Response text: ${cleanedText.substring(0, 200)}...`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          }
        } else {
          throw new HttpException(
            `Không thể parse JSON từ Ollama response. Không tìm thấy JSON array trong response. Response: ${cleanedText.substring(0, 500)}...`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Validate format
      // Ollama có thể trả về:
      // 1. Array: [{question, answer}, ...]
      // 2. Object với numeric keys: {"0": {question, answer}, "1": {...}}
      // 3. Single object: {question, answer}
      if (!Array.isArray(qaPairs)) {
        // Nếu là object, xử lý tùy trường hợp
        if (typeof qaPairs === 'object' && qaPairs !== null) {
          const qaObj = qaPairs as any;
          
          // Case 1: Object với key chứa array (phổ biến: questionsAnswers, qaPairs, data, results, items)
          const commonArrayKeys = ['questionsAnswers', 'qaPairs', 'qa_pairs', 'data', 'results', 'items', 'questions'];
          let foundArrayKey = false;
          for (const key of commonArrayKeys) {
            if (Array.isArray(qaObj[key])) {
              console.log(`[Ollama] Found array in key "${key}", extracting...`);
              qaPairs = qaObj[key] as GeneratedQA[];
              foundArrayKey = true;
              break;
            }
          }
          
          if (!foundArrayKey) {
            // Case 2: Single Q&A object {question, answer}
            if (qaObj.question && qaObj.answer) {
              console.log('[Ollama] Single Q&A object detected, wrapping to array');
              qaPairs = [qaObj] as GeneratedQA[];
            }
            // Case 3: Object với numeric keys {"0": {...}, "1": {...}}
            else {
              console.log('[Ollama] Converting object with numeric keys to array');
              const objectKeys = Object.keys(qaObj).sort((a, b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                  return numA - numB;
                }
                return a.localeCompare(b);
              });
              qaPairs = objectKeys.map(key => qaObj[key]).filter(item => item !== null && item !== undefined) as GeneratedQA[];
              console.log(`[Ollama] Converted ${qaPairs.length} items from object`);
            }
          }
        } else {
          throw new HttpException(
            `Ollama response không phải là array hoặc object. Type: ${typeof qaPairs}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
      }

      // Validate mỗi item có question và answer - Validation chặt chẽ hơn
      const validPairs = qaPairs.filter((item) => {
        if (!item || typeof item !== 'object') {
          console.warn('[Ollama] Invalid item (not object):', item);
          return false;
        }
        const hasQuestion = typeof item.question === 'string' && item.question.trim().length > 0;
        const hasAnswer = typeof item.answer === 'string' && item.answer.trim().length > 0;
        
        if (!hasQuestion || !hasAnswer) {
          console.warn('[Ollama] Invalid item (missing question/answer):', {
            hasQuestion,
            hasAnswer,
            keys: Object.keys(item),
            sample: JSON.stringify(item).substring(0, 200),
          });
          return false;
        }
        return true;
      });

      if (validPairs.length === 0) {
        // Log chi tiết để debug
        console.error('[Ollama] No valid Q&A pairs found.');
        console.error('[Ollama] Sample items:', qaPairs.slice(0, 3).map(item => ({
          type: typeof item,
          keys: item ? Object.keys(item) : [],
          sample: JSON.stringify(item).substring(0, 200),
        })));
        throw new HttpException(
          `Không có Q&A pair hợp lệ nào được tạo ra. Ollama trả về ${qaPairs.length} items nhưng không có item nào có format đúng {question: string, answer: string}. Có thể Ollama không hiểu prompt hoặc trả về format sai.`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      console.log(`[Ollama] ✅ Validated ${validPairs.length} Q&A pairs from ${qaPairs.length} total items`);

      return validPairs;
    } catch (error) {
      // Log error nhưng không expose internal details
      console.error('Lỗi khi gọi Ollama API:', error);

      // Re-throw với message rõ ràng hơn
      if (error instanceof HttpException) {
        throw error;
      }

      // Network errors hoặc unknown errors
      throw new HttpException(
        'Không thể generate Q&A pairs. Vui lòng kiểm tra Ollama server có đang chạy không.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Generate Q&A pairs từ text sử dụng Ollama LLM với retry logic
   * Tự động retry nếu chưa đủ số lượng yêu cầu, đảm bảo không trùng lặp
   * @param text - Văn bản đã được extract từ Tika
   * @param count - Số lượng Q&A pairs cần tạo (từ UI setting)
   * @returns Mảng các Q&A pairs với format {question, answer}
   * @throws HttpException nếu Ollama server không phản hồi hoặc response không hợp lệ
   */
  async generateQAPairs(text: string, count: number): Promise<GeneratedQA[]> {
    // Validate text có đủ dài không (ít nhất 100 chars)
    const trimmedText = text.trim();
    if (trimmedText.length < 100) {
      throw new HttpException(
        `Nội dung tài liệu quá ngắn (${trimmedText.length} chars). Cần ít nhất 100 ký tự để tạo Q&A pairs.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const allQAPairs: GeneratedQA[] = [];
    let attempts = 0;
    const maxAttempts = 10; // Tránh infinite loop
    const minPerAttempt = Math.max(1, Math.floor(count / 5)); // Ít nhất 1, hoặc 1/5 số lượng yêu cầu

    console.log(`[Ollama] Bắt đầu generate ${count} Q&A pairs với retry logic`);

    // Tách text thành nhiều chunk để mỗi attempt dùng context khác nhau
    const chunks = this.splitTextIntoChunks(trimmedText);
    console.log(`[Ollama] Text được tách thành ${chunks.length} chunk (max ~3000 chars mỗi chunk)`);

    while (allQAPairs.length < count && attempts < maxAttempts) {
      attempts++;
      const needed = count - allQAPairs.length;
      const requestCount = Math.max(minPerAttempt, needed); // Yêu cầu ít nhất minPerAttempt hoặc số còn thiếu

      console.log(
        `[Ollama] Attempt ${attempts}/${maxAttempts}: Đã có ${allQAPairs.length}/${count}, cần thêm ${needed} cặp`,
      );

      try {
        // Lấy danh sách câu hỏi đã có để tránh trùng lặp
        const existingQuestions = allQAPairs.map((qa) => qa.question);

        // Chọn chunk theo vòng tròn để mỗi attempt dùng phần context khác nhau
        const chunkIndex = (attempts - 1) % chunks.length;
        const chunkText = chunks[chunkIndex];
        console.log(
          `[Ollama] Attempt ${attempts}: sử dụng chunk #${chunkIndex + 1}/${chunks.length} với độ dài ${chunkText.length} chars`,
        );

        // Kiểm tra chunk có đủ dài không (ít nhất 100 chars)
        if (chunkText.trim().length < 100) {
          console.warn(
            `[Ollama] Attempt ${attempts}: Chunk quá ngắn (${chunkText.length} chars), không đủ để tạo Q&A. Dừng lại.`,
          );
          // Nếu đã có ít nhất 1 Q&A, break; nếu không thì throw error
          if (allQAPairs.length > 0) {
            break;
          } else {
            throw new HttpException(
              'Nội dung tài liệu quá ngắn hoặc đã hết. Không thể tạo thêm Q&A pairs.',
              HttpStatus.BAD_REQUEST,
            );
          }
        }

        // Gọi Ollama với chunk đã chọn
        const newPairs = await this.callOllamaOnce(chunkText, requestCount, existingQuestions);

        // Lọc duplicates
        const uniquePairs = this.filterDuplicates(newPairs, allQAPairs);

        if (uniquePairs.length === 0) {
          console.warn(
            `[Ollama] Attempt ${attempts}: Tất cả ${newPairs.length} cặp đều bị trùng lặp, bỏ qua`,
          );
        } else {
          allQAPairs.push(...uniquePairs);
          console.log(
            `[Ollama] Attempt ${attempts}: Thêm được ${uniquePairs.length} cặp mới (${newPairs.length - uniquePairs.length} bị trùng)`,
          );
        }
      } catch (error) {
        console.error(`[Ollama] Attempt ${attempts} failed:`, error);
        // Nếu là lỗi đầu tiên, throw luôn
        if (attempts === 1) {
          throw error;
        }
        // Nếu đã có một số pairs, log warning và tiếp tục
        if (allQAPairs.length > 0) {
          console.warn(
            `[Ollama] Attempt ${attempts} failed nhưng đã có ${allQAPairs.length} cặp, tiếp tục retry...`,
          );
        } else {
          // Nếu chưa có gì và đã retry nhiều lần, throw error
          throw error;
        }
      }

      // Nếu đã đủ, break
      if (allQAPairs.length >= count) {
        console.log(
          `[Ollama] ✅ Đã đủ ${allQAPairs.length}/${count} cặp sau ${attempts} attempts`,
        );
        break;
      }
    }

    // Nếu vẫn chưa đủ sau maxAttempts, log warning nhưng vẫn return
    if (allQAPairs.length < count) {
      console.warn(
        `[Ollama] ⚠️ Chỉ tạo được ${allQAPairs.length}/${count} cặp sau ${attempts} attempts. Có thể tài liệu không đủ nội dung hoặc Ollama không thể tạo thêm câu hỏi mới.`,
      );
    }

    return allQAPairs.slice(0, count); // Đảm bảo không vượt quá số lượng yêu cầu
  }
}

