import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** An error answer the client can act on. */
interface ClientError {
  readonly status: HttpStatus;
  readonly message: string;
}

/**
 * Postgres constraint errors that mean the request was wrong, not the server. The messages stay generic:
 * the raw database message names tables and constraints.
 */
const CONSTRAINT_ERRORS: Readonly<Record<string, ClientError>> = {
  '23503': { status: HttpStatus.BAD_REQUEST, message: 'A referenced record does not exist' },
  '23505': { status: HttpStatus.CONFLICT, message: 'The record already exists' },
};

function findConstraintError(exception: unknown): ClientError | null {
  if (!(exception instanceof QueryFailedError)) return null;
  const code = (exception.driverError as { code?: string } | undefined)?.code;
  return code === undefined ? null : (CONSTRAINT_ERRORS[code] ?? null);
}

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
    const { status, message } = this.toClientError(exception);
    response.status(status).json({ statusCode: status, message });
  }

  private toClientError(exception: unknown): ClientError {
    if (exception instanceof HttpException) return { status: exception.getStatus(), message: exception.message };
    const constraintError = findConstraintError(exception);
    if (constraintError !== null) {
      this.logger.warn(`Constraint violation: ${(exception as Error).message}`);
      return constraintError;
    }
    this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : exception);
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
