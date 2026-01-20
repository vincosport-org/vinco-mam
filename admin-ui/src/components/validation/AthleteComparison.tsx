import React from 'react';
import { formatPercentage } from '../../utils/formatters';

interface AthleteComparisonProps {
  item: {
    queueItemId: string;
    imageId: string;
    imageUrl?: string;
    athleteId?: string;
    athleteName?: string;
    headshotUrl?: string;
    confidence?: number;
    temporalBoost?: number;
    combinedScore?: number;
    recognitionMethod?: string;
  };
}

export function AthleteComparison({ item }: AthleteComparisonProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detected Image */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Detected Image
          </h3>
          {item.imageUrl ? (
            <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={item.imageUrl}
                alt="Detection"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg h-64 flex items-center justify-center">
              <p className="text-gray-500">Image not available</p>
            </div>
          )}
        </div>

        {/* Athlete Headshot */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {item.athleteName || 'Suggested Athlete'}
          </h3>
          {item.headshotUrl ? (
            <div className="relative bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
              <img
                src={item.headshotUrl}
                alt={item.athleteName || 'Athlete'}
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg h-64 flex items-center justify-center">
              <p className="text-gray-500">No headshot available</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {item.confidence !== undefined && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confidence</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPercentage(item.confidence)}
            </p>
          </div>
        )}
        {item.temporalBoost !== undefined && item.temporalBoost > 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Temporal Boost</p>
            <p className="text-2xl font-bold text-green-600">
              +{formatPercentage(item.temporalBoost)}
            </p>
          </div>
        )}
        {item.combinedScore !== undefined && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Combined Score</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatPercentage(item.combinedScore)}
            </p>
          </div>
        )}
        {item.recognitionMethod && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Method</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {item.recognitionMethod.toLowerCase()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
