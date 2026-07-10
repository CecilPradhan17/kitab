import { S3Client } from "@aws-sdk/client-s3";

// Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in the
// environment — the SDK's default credential provider chain picks these up
// automatically, so they're never referenced directly in code.
export const s3 = new S3Client({ region: process.env.AWS_REGION });

export const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;
export const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
