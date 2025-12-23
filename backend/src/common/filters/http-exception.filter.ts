import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * HTTP Exception Filter - Format error response chuẩn cho Frontend
 * Match với NestJS default error format: { statusCode, message, error? }
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || exception.message;

    // Format response match với FE expectation
    const errorResponse = {
      statusCode: status,
      message: Array.isArray(message) ? message.join(', ') : message,
      error: status >= 500 ? 'Internal Server Error' : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error (không log sensitive data)
    console.error(`[${status}] ${request.method} ${request.url} - ${message}`);

    response.status(status).json(errorResponse);
  }
}



