/**
 * Shared utilities for Vinco MAM Lambda functions
 */

/**
 * Generate a unique image ID
 */
exports.generateImageId = () => {
  return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parse S3 key to extract photographer ID
 */
exports.parsePhotographerId = (key) => {
  const parts = key.split('/');
  // Key format: photographers/{photographerId}/...
  if (parts.length > 1 && parts[0] === 'photographers') {
    return parts[1];
  }
  return null;
};

/**
 * Get file extension from key
 */
exports.getFileExtension = (key) => {
  const parts = key.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

/**
 * Check if file is RAW format
 */
exports.isRawFile = (key) => {
  const ext = exports.getFileExtension(key);
  const rawExtensions = ['cr2', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2', 'pef', 'srw', 'cr3'];
  return rawExtensions.includes(ext);
};

/**
 * Check if file is JPEG/TIFF
 */
exports.isStandardImage = (key) => {
  const ext = exports.getFileExtension(key);
  return ['jpg', 'jpeg', 'tiff', 'tif'].includes(ext);
};

/**
 * Format date for DynamoDB
 */
exports.formatDate = (date = new Date()) => {
  return date.toISOString();
};

/**
 * Create DynamoDB item for image
 */
exports.createImageItem = (imageId, metadata) => {
  return {
    imageId,
    uploadTime: exports.formatDate(),
    ...metadata,
  };
};
