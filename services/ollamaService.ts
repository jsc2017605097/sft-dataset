/**
 * Ollama Service - Generate Q&A pairs từ text
 * Gọi Ollama LLM để tạo các cặp câu hỏi và câu trả lời từ văn bản
 */

// Interface cho Q&A pairs được generate
export interface GeneratedQA {
  question: string;
  answer: string;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'llama3'; // Model mặc định, có thể config sau

/**
 * Generate Q&A pairs từ text sử dụng Ollama LLM
 * @param text - Văn bản đã được extract từ Tika
 * @param count - Số lượng Q&A pairs cần tạo (từ UI setting)
 * @returns Mảng các Q&A pairs với format {question, answer}
 * @throws Error nếu Ollama server không phản hồi hoặc response không hợp lệ
 */
export const generateQAPairs = async (
  text: string,
  count: number
): Promise<GeneratedQA[]> => {
  try {
    // Tạo system prompt và user prompt
    const systemPrompt = `Bạn là một chuyên gia pháp luật. Nhiệm vụ của bạn là tạo các cặp câu hỏi và câu trả lời (Q&A) từ tài liệu pháp luật được cung cấp.

Yêu cầu:
1. Ngôn ngữ: Tiếng Việt trang trọng, chính xác về mặt pháp lý
2. Nội dung: Câu hỏi phải là những gì người dùng thường hỏi về luật, câu trả lời phải chi tiết và trích dẫn logic từ tài liệu
3. Format: Trả về JSON array với format: [{"question": "...", "answer": "..."}, ...]
4. Số lượng: Tạo chính xác ${count} cặp Q&A`;

    const userPrompt = `Dựa trên tài liệu pháp luật sau đây, hãy tạo ${count} cặp câu hỏi và câu trả lời:

${text}

Lưu ý: Chỉ trả về JSON array, không có text thêm nào khác.`;

    // Gọi Ollama API
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        stream: false,
        format: 'json', // Yêu cầu Ollama trả về JSON
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Ollama response format: { response: "..." }
    // Cần parse response text thành JSON
    let responseText = '';
    if (data.response) {
      responseText = data.response;
    } else if (typeof data === 'string') {
      responseText = data;
    } else {
      throw new Error('Ollama response format không hợp lệ');
    }

    // Parse JSON từ response text
    // Có thể response chứa markdown code block, cần clean
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let qaPairs: GeneratedQA[];
    try {
      qaPairs = JSON.parse(cleanedText);
    } catch (parseError) {
      // Nếu parse thất bại, thử extract JSON từ text
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        qaPairs = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Không thể parse JSON từ Ollama response');
      }
    }

    // Validate format
    if (!Array.isArray(qaPairs)) {
      throw new Error('Ollama response không phải là array');
    }

    // Validate mỗi item có question và answer
    const validPairs = qaPairs.filter(
      (item) => item && typeof item.question === 'string' && typeof item.answer === 'string'
    );

    if (validPairs.length === 0) {
      throw new Error('Không có Q&A pair hợp lệ nào được tạo ra');
    }

    // Nếu số lượng ít hơn yêu cầu, log warning nhưng vẫn return
    if (validPairs.length < count) {
      console.warn(`Ollama chỉ tạo được ${validPairs.length} Q&A pairs thay vì ${count} như yêu cầu`);
    }

    return validPairs;
  } catch (error) {
    console.error('Lỗi khi gọi Ollama API:', error);
    
    // Re-throw với message rõ ràng hơn
    if (error instanceof Error) {
      throw new Error(`Không thể generate Q&A pairs: ${error.message}`);
    }
    throw new Error('Không thể generate Q&A pairs: Lỗi không xác định');
  }
};

