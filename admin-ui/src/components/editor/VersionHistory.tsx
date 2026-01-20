import { useQuery } from '@tanstack/react-query';
import { images } from '../../services/api';
import { LoadingSpinner, Button, Modal } from '../common';

interface EditParameters {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  highlights?: number;
  shadows?: number;
  whites?: number;
  blacks?: number;
  temperature?: number;
  tint?: number;
  vibrance?: number;
  clarity?: number;
  sharpness?: number;
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rotation?: number;
}

interface EditVersion {
  versionId: string;
  createdAt: string;
  createdBy: string;
  editParameters: EditParameters;
  thumbnailUrl?: string;
}

interface VersionHistoryProps {
  imageId: string;
  onRevert: (edits: EditParameters) => void;
  onClose: () => void;
}

export function VersionHistory({ imageId, onRevert, onClose }: VersionHistoryProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['edit-versions', imageId],
    queryFn: () => images.getVersions(imageId),
  });

  const versions: EditVersion[] = data?.data?.versions || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEditSummary = (edits: EditParameters) => {
    const changes: string[] = [];

    if (edits.exposure && edits.exposure !== 0) changes.push(`Exposure ${edits.exposure > 0 ? '+' : ''}${edits.exposure}`);
    if (edits.contrast && edits.contrast !== 0) changes.push(`Contrast ${edits.contrast > 0 ? '+' : ''}${edits.contrast}`);
    if (edits.saturation && edits.saturation !== 0) changes.push(`Saturation ${edits.saturation > 0 ? '+' : ''}${edits.saturation}`);
    if (edits.highlights && edits.highlights !== 0) changes.push(`Highlights ${edits.highlights > 0 ? '+' : ''}${edits.highlights}`);
    if (edits.shadows && edits.shadows !== 0) changes.push(`Shadows ${edits.shadows > 0 ? '+' : ''}${edits.shadows}`);
    if (edits.temperature && edits.temperature !== 5500) changes.push(`Temp ${edits.temperature}K`);
    if (edits.crop) changes.push('Cropped');
    if (edits.rotation) changes.push(`Rotated ${edits.rotation}`);

    return changes.length > 0 ? changes.slice(0, 3).join(', ') + (changes.length > 3 ? '...' : '') : 'No changes';
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Version History" size="lg">
      <div className="max-h-96 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            Failed to load version history
          </div>
        )}

        {!isLoading && !error && versions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No previous versions found
          </div>
        )}

        {!isLoading && !error && versions.length > 0 && (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.versionId}
                className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {version.thumbnailUrl ? (
                    <img
                      src={version.thumbnailUrl}
                      alt={`Version ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Version {versions.length - index}
                    </span>
                    {index === 0 && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(version.createdAt)} by {version.createdBy}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 truncate">
                    {getEditSummary(version.editParameters)}
                  </div>
                </div>

                {/* Revert button */}
                {index !== 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevert(version.editParameters)}
                  >
                    Revert
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </Modal>
  );
}
