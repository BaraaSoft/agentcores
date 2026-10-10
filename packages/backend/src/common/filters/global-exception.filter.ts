import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Last line of defence for HTTP requests: logs anything unexpected and returns
 * a consistent JSON error shape. Queue workers handle their own failures via BullMQ retries.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Converts any thrown value into an HTTP response.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    if (!isHttpException) {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    }
    response.status(status).json({
      statusCode: status,
      message: isHttpException ? exception.message : 'Internal server error',
    });
  }
}
