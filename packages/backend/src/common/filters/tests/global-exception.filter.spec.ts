import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { GlobalExceptionFilter } from '../global-exception.filter';

function queryError(code: string): QueryFailedError {
  return new QueryFailedError('INSERT INTO "workflows" ...', [], Object.assign(new Error('violates "FK_ef19"'), { code }));
}

function setup() {
  const json = jest.fn();
  const response = { status: jest.fn().mockReturnValue({ json }) };
  const host = { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost;
  jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  jest.spyOn(Logger.prototype, 'error').mockImplementation();
  return { filter: new GlobalExceptionFilter(), host, response, json };
}

describe('GlobalExceptionFilter', () => {
  afterEach(() => jest.restoreAllMocks());

  it('passes an HTTP exception through with its own status and message', () => {
    const t = setup();

    t.filter.catch(new NotFoundException('Strategy s-1 not found'), t.host);

    expect(t.response.status).toHaveBeenCalledWith(404);
    expect(t.json).toHaveBeenCalledWith({ statusCode: 404, message: 'Strategy s-1 not found' });
  });

  it('answers 400 for a missing referenced record, without the database message', () => {
    const t = setup();

    t.filter.catch(queryError('23503'), t.host);

    expect(t.json).toHaveBeenCalledWith({ statusCode: 400, message: 'A referenced record does not exist' });
  });

  it('answers 409 for a duplicate record', () => {
    const t = setup();

    t.filter.catch(queryError('23505'), t.host);

    expect(t.json).toHaveBeenCalledWith({ statusCode: 409, message: 'The record already exists' });
  });

  it('answers 500 for any other database error and for unknown errors', () => {
    const t = setup();

    t.filter.catch(queryError('42P01'), t.host);
    t.filter.catch(new Error('boom'), t.host);

    expect(t.json).toHaveBeenNthCalledWith(1, { statusCode: 500, message: 'Internal server error' });
    expect(t.json).toHaveBeenNthCalledWith(2, { statusCode: 500, message: 'Internal server error' });
  });
});
