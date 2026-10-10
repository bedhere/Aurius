import { Response } from 'express';

export function ok(res: Response, data: unknown = null, message = ''): Response {
  return res.status(200).json({ success: true, message, data });
}

export function created(res: Response, data: unknown = null, message = ''): Response {
  return res.status(201).json({ success: true, message, data });
}

export function fail(res: Response, status: number, message: string, errors: unknown = []): Response {
  return res.status(status).json({ success: false, message, errors });
}

export class AppError extends Error {
  status: number;
  errors: unknown;
  constructor(status: number, message: string, errors: unknown = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function badRequest(message: string, errors: unknown = []): AppError {
  return new AppError(400, message, errors);
}

export function unauthorized(message = 'Authentication required'): AppError {
  return new AppError(401, message);
}

export function forbidden(message = 'Permission denied'): AppError {
  return new AppError(403, message);
}

export function notFound(message = 'Resource not found'): AppError {
  return new AppError(404, message);
}

export function conflict(message: string): AppError {
  return new AppError(409, message);
}
