export interface EditParameters {
  exposure: number;                   // -5.0 to +5.0
  contrast: number;                   // -100 to +100
  highlights: number;                 // -100 to +100
  shadows: number;                    // -100 to +100
  whites: number;                     // -100 to +100
  blacks: number;                     // -100 to +100
  temperature: number;                // 2000 to 10000 (Kelvin)
  tint: number;                       // -150 to +150
  saturation: number;                 // -100 to +100
  vibrance: number;                   // -100 to +100
  sharpening: {
    amount: number;                   // 0 to 150
    radius: number;                   // 0.5 to 3.0
    detail: number;                   // 0 to 100
    masking: number;                  // 0 to 100
  };
  noiseReduction: {
    luminance: number;                // 0 to 100
    color: number;                    // 0 to 100
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;                 // Degrees
    aspectRatio?: string;             // e.g., "16:9", "4:3", "free"
  };
  lensCorrections: {
    distortion: boolean;
    vignette: boolean;
    chromaticAberration: boolean;
  };
}

export const defaultEdits: EditParameters = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 5500,
  tint: 0,
  saturation: 0,
  vibrance: 0,
  sharpening: {
    amount: 40,
    radius: 1.0,
    detail: 25,
    masking: 0,
  },
  noiseReduction: {
    luminance: 0,
    color: 0,
  },
  lensCorrections: {
    distortion: false,
    vignette: false,
    chromaticAberration: false,
  },
};

export interface ImageRecord {
  imageId: string;
  uploadTime: string;
  captureTime: string;
  photographerId: string;
  photographerName: string;
  originalKey: string;
  proxyKey: string;
  thumbnailKey: string;
  fileType: 'RAW_CR2' | 'RAW_CR3' | 'RAW_NEF' | 'RAW_ARW' | 'RAW_DNG' | 'JPEG' | 'TIFF';
  fileSizeBytes: number;
  dimensions: { width: number; height: number };
  exif: {
    camera?: string;
    lens?: string;
    focalLength?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    gps?: { lat: number; lng: number };
  };
  title?: string;
  description?: string;
  keywords: string[];
  eventId?: string;
  venueId?: string;
  year?: number;
  currentEdits?: EditParameters;
  recognitionStatus: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  recognizedAthletes: Array<{
    athleteId: string;
    confidence: number;
    temporalBoost: number;
    boundingBox: { left: number; top: number; width: number; height: number };
    status: 'AUTO_APPROVED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  }>;
  status: 'PROCESSING' | 'READY' | 'ARCHIVED';
  priority: 'NORMAL' | 'URGENT';
  starred: boolean;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}
