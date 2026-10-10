import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import { ok, badRequest, notFound, forbidden } from '../lib/response';
import { audit } from '../services/auditService';
import { roleToPriceLevel } from '../services/sequenceService';
import { DownloadStatus } from '@prisma/client';

function ipOf(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function roleLevelOf(role: string): number | null {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 1;
    case 'LICENSED_TRADESMAN':
      return 2;
    case 'SUB_DEALER':
      return 3;
    default:
      return null;
  }
}

export async function listDownloads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const level = roleToPriceLevel(req.auth!.role) ?? 0;
    const levelKey = `LEVEL${level}`;
    const files = await prisma.downloadFile.findMany({
      where: { status: DownloadStatus.PUBLISHED },
      orderBy: { createdAt: 'desc' },
    });
    const visible = files.filter((f) => {
      const roles = (f.allowedRoles ?? '').split(',');
      return roles.includes(levelKey);
    });
    ok(res, visible.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description,
      category: f.category,
      originalName: f.originalName,
      mime: f.mime,
      size: f.size,
      createdAt: f.createdAt,
    })));
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const file = await prisma.downloadFile.findUnique({ where: { id } });
    if (!file || file.status !== DownloadStatus.PUBLISHED) throw notFound('File not found');

    const level = roleToPriceLevel(req.auth!.role) ?? 0;
    const levelKey = `LEVEL${level}`;
    const roles = (file.allowedRoles ?? '').split(',');
    if (!roles.includes(levelKey)) throw forbidden('Your membership level does not have access to this file');

    const abs = path.resolve(file.filePath);
    if (!fs.existsSync(abs)) throw notFound('File missing on server');
    if (!abs.startsWith(path.resolve('..')) ) {
      // ensure the file lives under the uploads root
      const uploadsRoot = path.resolve(process.env.UPLOAD_PATH ?? '../uploads');
      if (!abs.startsWith(uploadsRoot)) throw forbidden('Invalid file path');
    }

    await prisma.downloadAccessLog.create({
      data: { fileId: id, userId: req.auth!.uid, aurId: req.auth!.aurId ?? null, ip: ipOf(req) },
    });
    await audit({
      userId: req.auth!.uid,
      action: 'FILE_DOWNLOADED',
      targetType: 'DownloadFile',
      targetId: String(id),
      ip: ipOf(req),
    });

    res.download(abs, file.originalName);
  } catch (err) {
    next(err);
  }
}
