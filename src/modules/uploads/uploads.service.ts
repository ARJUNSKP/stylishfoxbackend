import { R2Service } from "../../services/r2.service.js";

export class UploadsService {
  static async getPresignedUpload(fileName: string, contentType: string, folder: string = "products") {
    const extension = fileName.split(".").pop() || "jpg";
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    return await R2Service.getPresignedUploadUrl(key, contentType);
  }

  static async uploadDirect(
    fileName: string,
    buffer: Buffer | Uint8Array,
    contentType: string,
    folder: string = "products"
  ) {
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const extension = sanitizedName.split(".").pop() || "jpg";
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const url = await R2Service.uploadFile(key, buffer, contentType);
    return { key, url };
  }

  /**
   * Upload base64 encoded image directly to Cloudflare R2
   */
  static async uploadBase64(
    base64Data: string,
    folder: string = "products",
    defaultExt: string = "jpg"
  ): Promise<{ key: string; url: string }> {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let contentType = `image/${defaultExt}`;
    let buffer: Buffer;

    if (matches && matches.length === 3) {
      contentType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(base64Data, "base64");
    }

    const extension = contentType.split("/")[1] || defaultExt;
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const url = await R2Service.uploadFile(key, buffer, contentType);
    return { key, url };
  }

  static async deleteFile(keyOrUrl: string) {
    return await R2Service.deleteFile(keyOrUrl);
  }

  static async getFile(key: string) {
    return await R2Service.getFile(key);
  }
}
