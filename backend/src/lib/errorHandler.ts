import { NextFunction, Request, Response } from 'express';
import { AppError } from './response';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, errors: err.errors });
    return;
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      res.status(409).json({ success: false, message: 'Duplicate record violates a unique constraint', errors: [] });
      return;
    }
    if (code === 'P2025') {
      res.status(404).json({ success: false, message: 'Record not found', errors: [] });
      return;
    }
  }
  if (err instanceof Error && err.name === 'MulterError') {
    res.status(400).json({ success: false, message: `Upload error: ${err.message}`, errors: [] });
    return;
  }
  console.error('[UnhandledError]', err);
  res.status(500).json({ success: false, message: 'Internal server error', errors: [] });
}
