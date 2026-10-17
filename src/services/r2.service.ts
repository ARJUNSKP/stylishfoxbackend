import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

// Initialize S3 Client configured for Cloudflare R2
const r2Client = new S3Client({
  region: "auto",
  endpoint: env.R2_ACCOUNT_ID
    ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
  },
});

export class R2Service {
  /**
   * Checks whether Cloudflare R2 credentials are configured
   */
  static isConfigured(): boolean {
    return Boolean(
      env.R2_ACCOUNT_ID &&
      env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY
    );
  }

  /**
   * Extracts the R2 object key from a full public URL
   */
  static extractKeyFromUrl(url: string): string | null {
    try {
      if (url.startsWith(env.R2_PUBLIC_URL)) {
        return url.replace(`${env.R2_PUBLIC_URL}/`, "");
      }
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }

  /**
   * Uploads a file buffer or stream directly to Cloudflare R2
   */
  static async uploadFile(
    key: string,
    body: Buffer | Uint8Array,
    contentType: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      console.warn(
        `⚠️ [R2Service] Cloudflare R2 credentials are not set in .env. Simulating R2 upload for key: ${key}`
      );
      return `${env.R2_PUBLIC_URL}/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await r2Client.send(command);
    return `${env.R2_PUBLIC_URL}/${key}`;
  }

  /**
   * Generates a pre-signed upload URL so clients can upload directly to R2
   */
  static async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 3600
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (!this.isConfigured()) {
      console.warn(
        `⚠️ [R2Service] Cloudflare R2 credentials are not set in .env. Returning simulated presigned URL.`
      );
      return {
        uploadUrl: `${env.R2_PUBLIC_URL}/${key}?simulated=true`,
        publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
        key,
      };
    }

    const command = new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      publicUrl: `${env.R2_PUBLIC_URL}/${key}`,
      key,
    };
  }

  /**
   * Deletes a file from Cloudflare R2 by key or public URL
   */
  static async deleteFile(keyOrUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(keyOrUrl) || keyOrUrl;

    if (!this.isConfigured()) {
      console.warn(
        `⚠️ [R2Service] Cloudflare R2 credentials are not set in .env. Skipping delete for key: ${key}`
      );
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  }
}
