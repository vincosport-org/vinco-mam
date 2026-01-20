/**
 * S3 helper utilities
 */
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({});

/**
 * Generate pre-signed URL for S3 object
 */
exports.getPresignedUrl = async (bucket, key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn });
};

/**
 * Get object from S3
 */
exports.getObject = async (bucket, key) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await s3.send(command);
};

/**
 * Put object to S3
 */
exports.putObject = async (bucket, key, body, contentType = null, metadata = {}) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });
  await s3.send(command);
  return key;
};

/**
 * Delete object from S3
 */
exports.deleteObject = async (bucket, key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  await s3.send(command);
};

module.exports = exports;
