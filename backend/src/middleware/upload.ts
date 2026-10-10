import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../config';
import { badRequest } from '../lib/response';

// ---------------------------------------------------------------------------
// Secure upload handling: extension + MIME whitelist + size limit.
// Stored under uploads/ with random names — original names are kept as
// metadata only. Faking an extension does not bypass the MIME check.
// ---------------------------------------------------------------------------

export const ALLOWED_DOC_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
export const ALLOWED_DOC_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);
export const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const sub = (_req as unknown as { uploadSub?: string }).uploadSub ?? 'general';
    const dir = path.join(config.uploadPath, sub);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

function fileFilter(allowedExt: Set<string>, allowedMimes: Set<string>) {
  return (_req: unknown, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    if (!allowedExt.has(ext)) {
      cb(badRequest(`File type "${ext}" is not allowed. Accepted: ${[...allowedExt].join(', ')}`));
      return;
    }
    if (!allowedMimes.has(mime)) {
      cb(badRequest(`File MIME type "${mime}" is not allowed.`));
      return;
    }
    cb(null, true);
  };
}

export const docUpload = multer({
  storage,
  limits: { fileSize: config.maxFileMb * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED_DOC_EXTENSIONS, ALLOWED_DOC_MIMES),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter(ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIMES),
});

export function uploadSub(sub: string) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction): void => {
    (req as unknown as { uploadSub?: string }).uploadSub = sub;
    next();
  };
}
