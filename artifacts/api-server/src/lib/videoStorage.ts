import { objectStorageClient } from "./objectStorage";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";

function getBucketAndPrefix(): { bucketName: string; prefix: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  const m = dir.replace(/^\/+/, "").split("/");
  const bucketName = m[0];
  const prefix = m.slice(1).join("/");
  return { bucketName, prefix: prefix ? `${prefix}/videos` : "videos" };
}

/**
 * Uploads a local video file to GCS object storage and returns a signed URL
 * valid for 30 days (long enough for educational use).
 */
export async function uploadVideoToStorage(localPath: string, contentType = "video/mp4"): Promise<{
  url: string;
  objectPath: string;
}> {
  const { bucketName, prefix } = getBucketAndPrefix();
  const objectName = `${prefix}/${randomUUID()}.mp4`;
  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  const buf = await fs.readFile(localPath);
  await file.save(buf, {
    contentType,
    resumable: false,
    metadata: { contentType, cacheControl: "public, max-age=2592000" },
  });
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  });
  return { url, objectPath: `${bucketName}/${objectName}` };
}
