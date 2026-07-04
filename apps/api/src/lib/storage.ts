import { randomUUID } from "node:crypto";
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface StoredFile {
  key: string;
  size: number;
  mimeType: string | null;
  originalName: string;
}

export interface Storage {
  save(input: {
    orgId: string;
    clientId: string;
    originalName: string;
    mimeType: string | null;
    buffer: Buffer;
  }): Promise<StoredFile>;

  stream(key: string): Promise<NodeJS.ReadableStream>;

  remove(key: string): Promise<void>;
}

function safeName(name: string): string {
  const base = path.basename(name).slice(0, 200);
  return base.replace(/[^\w.\-]/g, "_") || "file";
}

// ─── LocalStorage — dev / fallback ──────────────────────────
class LocalStorage implements Storage {
  private root: string;

  constructor(root: string) {
    this.root = path.resolve(process.cwd(), root);
  }

  async save({
    orgId,
    clientId,
    originalName,
    mimeType,
    buffer,
  }: {
    orgId: string;
    clientId: string;
    originalName: string;
    mimeType: string | null;
    buffer: Buffer;
  }): Promise<StoredFile> {
    const relDir = path.posix.join(orgId, clientId);
    const dir = path.join(this.root, relDir);
    await fs.mkdir(dir, { recursive: true });

    const filename = `${randomUUID()}-${safeName(originalName)}`;
    const relPath = path.posix.join(relDir, filename);
    const abs = path.join(this.root, relPath);

    await fs.writeFile(abs, buffer);
    logger.debug({ path: abs, size: buffer.byteLength }, "storage: saved (local)");

    return { key: relPath, size: buffer.byteLength, mimeType, originalName };
  }

  async stream(key: string): Promise<NodeJS.ReadableStream> {
    const abs = this.resolveKey(key);
    await fs.access(abs);
    return createReadStream(abs);
  }

  async remove(key: string): Promise<void> {
    const abs = this.resolveKey(key);
    await fs.unlink(abs).catch((err) => {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    });
  }

  private resolveKey(key: string): string {
    const abs = path.resolve(this.root, key);
    if (!abs.startsWith(this.root + path.sep) && abs !== this.root) {
      throw new Error("Invalid storage key");
    }
    return abs;
  }
}

// ─── S3Storage — production / S3-compatible ─────────────────
class S3Storage implements Storage {
  private client: S3Client;
  private bucket: string;

  constructor(bucket: string, config: S3ClientConfig) {
    this.bucket = bucket;
    this.client = new S3Client(config);
  }

  async save({
    orgId,
    clientId,
    originalName,
    mimeType,
    buffer,
  }: {
    orgId: string;
    clientId: string;
    originalName: string;
    mimeType: string | null;
    buffer: Buffer;
  }): Promise<StoredFile> {
    const key = path.posix.join(orgId, clientId, `${randomUUID()}-${safeName(originalName)}`);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType ?? "application/octet-stream",
        Metadata: { "original-name": encodeURIComponent(originalName) },
      }),
    );
    logger.debug({ key, size: buffer.byteLength }, "storage: saved (s3)");
    return { key, size: buffer.byteLength, mimeType, originalName };
  }

  async stream(key: string): Promise<NodeJS.ReadableStream> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = res.Body;
    if (!body) throw new Error("Empty response from S3");
    // The AWS SDK returns a stream when running under Node.
    return body as Readable;
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

// ─── Factory ─────────────────────────────────────────────────
function makeStorage(): Storage {
  if (env.S3_BUCKET) {
    logger.info(
      { bucket: env.S3_BUCKET, endpoint: env.S3_ENDPOINT ?? "aws", region: env.S3_REGION },
      "storage: using S3",
    );
    return new S3Storage(env.S3_BUCKET, {
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials:
        env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY_ID,
              secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }
  logger.info(
    { root: env.UPLOAD_ROOT },
    "storage: S3_BUCKET not set — using LocalStorage (dev fallback)",
  );
  return new LocalStorage(env.UPLOAD_ROOT);
}

export const storage: Storage = makeStorage();
