import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(request, { params }) {
  try {
    const rawStorageDir = process.env.STORAGE_DIR?.trim();

    if (!rawStorageDir) {
      if (process.env.NODE_ENV !== 'production') {
        const fallback = path.resolve(process.cwd(), 'storage', 'uploads');
        return serveFile(fallback, params);
      }
      return new NextResponse('Storage directory configuration missing', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return serveFile(path.resolve(rawStorageDir), params);
  } catch (error) {
    console.error('Error serving uploaded file:', error);
    return new NextResponse('Internal server error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function serveFile(storageDir, params) {
  const resolvedParams = await params;
  const pathSegments = resolvedParams?.path;

  if (!pathSegments || !Array.isArray(pathSegments) || pathSegments.length === 0) {
    return new NextResponse('File not found', { status: 404 });
  }

  // Reject path traversal tokens in segments
  for (const segment of pathSegments) {
    if (
      !segment ||
      segment.includes('..') ||
      segment.includes('/') ||
      segment.includes('\\') ||
      segment.includes('\0')
    ) {
      return new NextResponse('Invalid file path', { status: 400 });
    }
  }

  // Normalize and resolve path
  const relativePath = pathSegments.join(path.sep);
  const normalizedRelative = path.normalize(relativePath);

  if (normalizedRelative.startsWith('..') || path.isAbsolute(normalizedRelative)) {
    return new NextResponse('Invalid file path', { status: 400 });
  }

  const resolvedFilePath = path.resolve(storageDir, normalizedRelative);

  // Ensure resolved path is strictly inside storage directory
  const relativeFromStorage = path.relative(storageDir, resolvedFilePath);
  if (relativeFromStorage.startsWith('..') || path.isAbsolute(relativeFromStorage)) {
    return new NextResponse('Access denied', { status: 403 });
  }

  // Validate allowed extensions
  const ext = path.extname(resolvedFilePath).toLowerCase();
  const contentType = MIME_TYPES[ext];

  if (!contentType) {
    return new NextResponse('Unsupported file type', { status: 400 });
  }

  // Read and return file
  try {
    const fileBuffer = await fs.readFile(resolvedFilePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
      return new NextResponse('File not found', { status: 404 });
    }
    throw err;
  }
}
