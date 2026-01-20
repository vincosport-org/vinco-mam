/**
 * AWS Rekognition helper utilities
 */
const { RekognitionClient, DetectFacesCommand, SearchFacesByImageCommand, DetectTextCommand, IndexFacesCommand } = require('@aws-sdk/client-rekognition');

const rekognition = new RekognitionClient({});

/**
 * Detect faces in image
 */
exports.detectFaces = async (bucket, key, collectionId = null) => {
  const command = new DetectFacesCommand({
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    Attributes: ['ALL'],
  });
  
  const response = await rekognition.send(command);
  return response.FaceDetails || [];
};

/**
 * Search for faces in collection
 */
exports.searchFacesByImage = async (bucket, key, collectionId, faceMatchThreshold = 80, maxFaces = 10) => {
  const command = new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    FaceMatchThreshold: faceMatchThreshold,
    MaxFaces: maxFaces,
  });
  
  const response = await rekognition.send(command);
  return response.FaceMatches || [];
};

/**
 * Detect text in image
 */
exports.detectText = async (bucket, key) => {
  const command = new DetectTextCommand({
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
  });
  
  const response = await rekognition.send(command);
  return response.TextDetections || [];
};

/**
 * Index face in collection
 */
exports.indexFace = async (bucket, key, collectionId, externalImageId = null) => {
  const command = new IndexFacesCommand({
    CollectionId: collectionId,
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: key,
      },
    },
    ExternalImageId: externalImageId,
    MaxFaces: 1,
    QualityFilter: 'AUTO',
    DetectionAttributes: ['ALL'],
  });
  
  const response = await rekognition.send(command);
  return response.FaceRecords && response.FaceRecords.length > 0 
    ? response.FaceRecords[0] 
    : null;
};

/**
 * Extract bib numbers from text detections
 */
exports.extractBibNumbers = (textDetections) => {
  const bibPattern = /^[A-Z]?\d{1,4}$/;
  const bibs = [];
  
  for (const detection of textDetections) {
    if (detection.Type === 'WORD' && bibPattern.test(detection.DetectedText)) {
      bibs.push({
        text: detection.DetectedText,
        confidence: detection.Confidence,
        boundingBox: detection.Geometry?.BoundingBox,
      });
    }
  }
  
  return bibs;
};

module.exports = exports;
