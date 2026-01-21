import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Modal, Button } from '../common';
import { images } from '../../services/api';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  objectUrl?: string;
}

export const UploadDialog: React.FC<UploadDialogProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs when files change or component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs on unmount
      files.forEach((f) => {
        if (f.objectUrl) {
          URL.revokeObjectURL(f.objectUrl);
        }
      });
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (file) => file.type.startsWith('image/')
    );

    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter(
        (file) => file.type.startsWith('image/')
      );
      addFiles(selectedFiles);
    }
  };

  const addFiles = (newFiles: File[]) => {
    const newFileStatuses: FileUploadStatus[] = newFiles.map((file) => ({
      file,
      status: 'pending',
      progress: 0,
      objectUrl: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...newFileStatuses]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const file = prev[index];
      // Revoke the object URL to prevent memory leak
      if (file?.objectUrl) {
        URL.revokeObjectURL(file.objectUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setIsUploading(true);

    // Get presigned URLs for all pending files
    const pendingFiles = files.filter((f) => f.status === 'pending');
    const fileData = pendingFiles.map((f) => ({
      filename: f.file.name,
      contentType: f.file.type,
    }));

    try {
      const response = await images.getUploadUrls(fileData);
      const uploadData = response.data?.uploads || response.data || [];

      // Create a copy of files for tracking
      const filesToUpload = [...pendingFiles];
      let completedCount = 0;
      let successCount = 0;

      // Upload each file
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileStatus = filesToUpload[i];
        const upload = uploadData[i];
        const fileIndex = files.findIndex((f) => f.file === fileStatus.file);

        if (fileIndex === -1) continue;

        if (!upload) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, status: 'error', error: 'No upload URL received' } : f
            )
          );
          completedCount++;
          continue;
        }

        // Update status to uploading
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { ...f, status: 'uploading', progress: 0 } : f
          )
        );

        try {
          // Upload directly to S3 using presigned URL
          await uploadToS3(upload.uploadUrl, fileStatus.file, (progress) => {
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === fileIndex ? { ...f, progress } : f
              )
            );
          });

          // Mark as success
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { ...f, status: 'success', progress: 100 } : f
            )
          );
          successCount++;
        } catch (error) {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex
                ? {
                    ...f,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : f
            )
          );
        }
        completedCount++;
      }

      // Check if all uploads succeeded after completion
      if (successCount === filesToUpload.length && filesToUpload.length > 0) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Failed to get upload URLs:', error);
      setFiles((prev) =>
        prev.map((f) =>
          f.status === 'pending'
            ? {
                ...f,
                status: 'error',
                error: 'Failed to get upload URLs',
              }
            : f
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const uploadToS3 = (
    url: string,
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const handleClose = () => {
    if (!isUploading) {
      // Revoke all object URLs before clearing
      files.forEach((f) => {
        if (f.objectUrl) {
          URL.revokeObjectURL(f.objectUrl);
        }
      });
      setFiles([]);
      onClose();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Images" size="lg">
      <div className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          <svg
            className="w-12 h-12 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>

          <p className="text-gray-600 dark:text-gray-300">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Click to upload
            </span>{' '}
            or drag and drop
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            JPG, PNG, or TIFF files
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {files.map((fileStatus, index) => (
                <div
                  key={`${fileStatus.file.name}-${index}`}
                  className="flex items-center gap-3 p-3 border-b dark:border-gray-700 last:border-b-0"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0 overflow-hidden">
                    {fileStatus.objectUrl && (
                      <img
                        src={fileStatus.objectUrl}
                        alt={fileStatus.file.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {fileStatus.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileStatus.file.size)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0">
                    {fileStatus.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}

                    {fileStatus.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${fileStatus.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{fileStatus.progress}%</span>
                      </div>
                    )}

                    {fileStatus.status === 'success' && (
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}

                    {fileStatus.status === 'error' && (
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span className="text-xs text-red-500">{fileStatus.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 border-t dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {files.length} file{files.length !== 1 ? 's' : ''} selected
                {successCount > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-2">
                    ({successCount} uploaded)
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600 dark:text-red-400 ml-2">
                    ({errorCount} failed)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {successCount === files.length && files.length > 0 ? 'Done' : 'Cancel'}
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
