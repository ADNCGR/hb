import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toBody(): ApiErrorBody {
    return { code: this.code, message: this.message, ...(this.details ? { details: this.details } : {}) };
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
