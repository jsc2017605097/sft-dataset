
import { GoogleGenAI, Type } from "@google/genai";

export interface GeneratedQA {
  question: string;
  answer: string;
}

export const generateQAPairs = async (fileName: string, sentencesPerChunk: number): Promise<GeneratedQA[]> => {
  try {
    // Khởi tạo bên trong hàm để an toàn hơn
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API_KEY chưa được thiết lập. Đang sử dụng dữ liệu mẫu.");
      return [
        { question: `Câu hỏi mẫu về ${fileName}`, answer: `Dữ liệu mẫu (Cần API KEY để tạo nội dung thật).` }
      ];
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Hãy tạo 5 cặp câu hỏi và trả lời (Q&A) thực tế dùng cho huấn luyện SFT tiếng Việt, dựa trên tài liệu pháp luật có tên là "${fileName}". 
      Yêu cầu:
      1. Ngôn ngữ: Tiếng Việt trang trọng, chính xác về mặt pháp lý.
      2. Nội dung: Câu hỏi phải là những gì người dùng thường hỏi về luật, câu trả lời phải chi tiết và trích dẫn logic từ luật.
      3. Tham số: Mỗi đoạn nội dung được giả định dài khoảng ${sentencesPerChunk} câu.
      Trả về kết quả dưới định dạng JSON mảng các đối tượng có thuộc tính 'question' và 'answer'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'Câu hỏi của người dùng.' },
              answer: { type: Type.STRING, description: 'Câu trả lời chi tiết từ tài liệu.' },
            },
            required: ['question', 'answer'],
            propertyOrdering: ["question", "answer"],
          },
        },
      },
    });

    const responseText = response.text;
    if (responseText) {
      return JSON.parse(responseText.trim());
    }
    return [];
  } catch (error) {
    console.error("Lỗi khi gọi Gemini AI:", error);
    return [
      { question: `Câu hỏi mẫu về ${fileName}`, answer: `Câu trả lời mẫu được trích xuất từ ${fileName}.` }
    ];
  }
};
