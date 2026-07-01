import * as faceapi from '@vladmandic/face-api';

/**
 * Load required face‑api.js models.
 * Expected files are placed under /models/face-api in the public folder.
 */
export const loadFaceApiModels = async (basePath: string = '/models/face-api') => {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(basePath),
    faceapi.nets.faceLandmark68Net.loadFromUri(basePath),
    faceapi.nets.faceRecognitionNet.loadFromUri(basePath),
  ]);
};

/**
 * Fetch known face descriptors from a JSON file.
 * The JSON should be an array of arrays, each inner array represents a Float32 descriptor.
 */
export const getKnownDescriptors = async (): Promise<Float32Array[]> => {
  const response = await fetch('/data/knownDescriptors.json');
  if (!response.ok) {
    throw new Error('Failed to load knownDescriptors.json');
  }
  const raw: number[][] = await response.json();
  return raw.map(arr => new Float32Array(arr));
};

/**
 * Compare a candidate descriptor with a list of known descriptors.
 * Returns true if any known descriptor is within the threshold distance.
 */
export const matchDescriptor = async (
  descriptor: Float32Array,
  known: Float32Array[],
  threshold = 0.5
): Promise<boolean> => {
  const distance = (a: Float32Array, b: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  };
  return known.some(d => distance(descriptor, d) < threshold);
};
