/**
 * Image Upload Lambda - Generates presigned URLs for direct S3 upload
 * Supports browser-based uploads with optional metadata
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const auth = require('/opt/nodejs/auth');

const s3 = new S3Client({});
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET;

exports.handler = async (event) => {
  try {
    // Authenticate user
    const user = auth.getUserFromRequest(event);
    if (!user) {
      return auth.createErrorResponse(401, 'Unauthorized');
    }

    // Check permission - need at least content editor role
    if (!auth.hasPermission(user, 'EDITOR')) {
      return auth.createErrorResponse(403, 'Insufficient permissions to upload images');
    }

    const body = JSON.parse(event.body || '{}');
    const { files, folderPath, metadata } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return auth.createErrorResponse(400, 'Files array is required');
    }

    if (files.length > 50) {
      return auth.createErrorResponse(400, 'Maximum 50 files per upload batch');
    }

    // Generate presigned URLs for each file
    const uploadUrls = [];
    const skippedFiles = [];
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uploaderUsername = user.username || 'web-upload';

    for (const file of files) {
      const { filename, contentType } = file;

      if (!filename) {
        skippedFiles.push({ filename: '(empty)', reason: 'No filename provided' });
        continue;
      }

      // Validate file type
      const ext = (filename.split('.').pop() || '').toLowerCase();
      const allowedExtensions = ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'srf', 'dng', 'webp'];
      if (!allowedExtensions.includes(ext)) {
        skippedFiles.push({ filename, reason: `Unsupported file type: ${ext}` });
        continue;
      }

      // Build S3 key: photographers/{username}/{date}/{filename}
      // This matches the expected format for the image processor
      const basePath = folderPath
        ? `photographers/${uploaderUsername}/${folderPath}`
        : `photographers/${uploaderUsername}/${timestamp}`;

      // Sanitize filename
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const s3Key = `${basePath}/${safeFilename}`;

      try {
        // Generate presigned PUT URL
        const command = new PutObjectCommand({
          Bucket: UPLOADS_BUCKET,
          Key: s3Key,
          ContentType: contentType || 'image/jpeg',
          Metadata: {
            'uploaded-by': uploaderUsername,
            'upload-source': 'web-browser',
            'original-filename': filename,
            ...(metadata || {}),
          },
        });

        const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 hour

        uploadUrls.push({
          filename,
          s3Key,
          uploadUrl: presignedUrl,
          expiresIn: 3600,
        });
      } catch (urlError) {
        console.error(`Error generating URL for ${filename}:`, urlError);
        skippedFiles.push({ filename, reason: 'Failed to generate upload URL' });
      }
    }

    if (uploadUrls.length === 0 && skippedFiles.length > 0) {
      return auth.createErrorResponse(400, `No valid files to upload. Skipped: ${skippedFiles.map(f => f.filename).join(', ')}`);
    }

    return auth.createResponse(200, {
      success: true,
      uploads: uploadUrls,
      skipped: skippedFiles.length > 0 ? skippedFiles : undefined,
      message: `Generated ${uploadUrls.length} upload URL(s)${skippedFiles.length > 0 ? `, skipped ${skippedFiles.length} file(s)` : ''}`,
    });
  } catch (error) {
    console.error('Error generating upload URLs:', error);
    return auth.createErrorResponse(500, error.message || 'Internal server error');
  }
};
