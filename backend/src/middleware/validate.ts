import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = (result as { error: ZodError }).error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      res.status(400).json({ success: false, message: 'Validation failed', errors });
      return;
    }
    (req as unknown as Record<string, unknown>)[`validated_${source}`] = result.data;
    next();
  };
}

export function validated<T>(req: Request, source: 'body' | 'query' | 'params' = 'body'): T {
  return (req as unknown as Record<string, T>)[`validated_${source}`];
}
