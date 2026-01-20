import React from 'react';
import { formatDate, formatPercentage } from '../../utils/formatters';

interface ValidationItemProps {
  item: {
    queueItemId: string;
    imageId: string;
    athleteId?: string;
    athleteName?: string;
    confidence?: number;
    combinedScore?: number;
    status: string;
    imageUrl?: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export function ValidationItem({ item, isSelected, onClick }: ValidationItemProps) {
  return (
    <div
      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt="Validation item"
            className="w-16 h-16 object-cover rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.athleteName || 'Unknown Athlete'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Image: {item.imageId.substring(0, 8)}...
          </p>
          {item.confidence !== undefined && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatPercentage(item.confidence)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full ${
                    item.confidence > 0.8 ? 'bg-green-600' :
                    item.confidence > 0.6 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${item.confidence * 100}%` }}
                />
              </div>
            </div>
          )}
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                item.status === 'CLAIMED'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {item.status}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
