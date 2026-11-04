import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const endpoint = process.env.STORAGE_ENDPOINT || 'http://localhost:9000'
const region = process.env.STORAGE_REGION || 'us-east-1'
const accessKeyId = process.env.STORAGE_ACCESS_KEY || 'minioadmin'
const secretAccessKey = process.env.STORAGE_SECRET_KEY || 'minioadmin'
export const defaultBucket = process.env.STORAGE_BUCKET || 'creator-edu-files'

export const storage = new S3Client({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  forcePathStyle: true, // required for MinIO
})

export async function ensureBucket(bucket = defaultBucket) {
  try {
    await storage.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch (err: any) {
    if (err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404) {
      await storage.send(new CreateBucketCommand({ Bucket: bucket }))
    }
  }
}

export async function getUploadUrl(
  key: string,
  contentType?: string,
  bucket = defaultBucket,
  expiresIn = 3600
) {
  await ensureBucket(bucket)
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream',
  })
  return getSignedUrl(storage, command, { expiresIn })
}

export async function getDownloadUrl(
  key: string,
  bucket = defaultBucket,
  expiresIn = 3600
) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  return getSignedUrl(storage, command, { expiresIn })
}

export async function deleteFile(key: string, bucket = defaultBucket) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })
  return storage.send(command)
}

export function getPublicUrl(key: string, bucket = defaultBucket) {
  return `${endpoint}/${bucket}/${key}`
}

