# SFT Dataset Backend

NestJS Backend cho SFT Dataset - Tương thích với React Frontend

## Cài đặt

```bash
# Install dependencies
npm install
# hoặc
pnpm install
```

## Cấu hình

Copy `.env` và cấu hình các biến môi trường:

```env
PORT=3001
# Tika và Ollama chạy trên localhost (server-side)
TIKA_ENDPOINT=http://localhost:9998/tika
OLLAMA_ENDPOINT=http://localhost:11434/api/generate
OLLAMA_MODEL=ubkt:latest
# CORS cho phép client (frontend) từ IP này truy cập
CORS_ORIGIN=http://100.101.198.12:3000
```

## Chạy ứng dụng

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

### POST /api/upload/process

Upload file và process để generate Q&A pairs.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File (PDF/DOCX)
  - `autoGenerate`: boolean (optional, default: true)
  - `count`: number (optional, default: 5)

**Response:**
```json
{
  "fileName": "document.pdf",
  "fileSize": "2.45 MB",
  "qaPairs": [
    {
      "question": "...",
      "answer": "..."
    }
  ]
}
```

## Kiến trúc

- **Modules**: Upload, Documents (sau này)
- **Services**: Tika, Ollama
- **DTOs**: Validation cho requests/responses
- **Filters**: Exception handling

## Tương thích với Frontend

Backend được thiết kế để tương thích 100% với React Frontend:
- Response format match với `frontend/types.ts`
- Error format chuẩn NestJS
- CORS enabled cho FE dev server

