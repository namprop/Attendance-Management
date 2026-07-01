import * as faceapi from '@vladmandic/face-api';

/**
 * Detect eye blink using Eye Aspect Ratio (EAR).
 * Returns true if a blink is detected in the current landmarks.
 */
export const detectBlink = (landmarks: faceapi.FaceLandmarks68): boolean => {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const eyeAspectRatio = (eye: faceapi.Point[]): number => {
    const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const v3 = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    return (v1 + v2) / (2.0 * v3);
  };

  const leftEAR = eyeAspectRatio(leftEye);
  const rightEAR = eyeAspectRatio(rightEye);
  const ear = (leftEAR + rightEAR) / 2.0;

  // EAR < 0.2 usually indicates a blink (closed eyes)
  return ear < 0.2;
};

/**
 * Determine whether the video dimensions resemble a phone screen.
 * Used to lower the liveness threshold for suspicious aspect ratios.
 */
export const isPhoneLikeImage = (video: HTMLVideoElement): boolean => {
  if (!video?.videoWidth || !video?.videoHeight) return false;
  const ratio = video.videoWidth / video.videoHeight;
  // Typical phone ratios: 16:9 (≈1.78) or 9:16 (≈0.56)
  const phoneRatios = [1.78, 0.56];
  return phoneRatios.some((r) => Math.abs(r - ratio) < 0.15);
};

/**
 * Compute average per‑pixel luminance difference between two frames.
 * Returns a value between 0 (identical) and 1 (completely different).
 */
export const frameDiff = (f1: ImageData, f2: ImageData): number => {
  const len = f1.data.length;
  let diff = 0;
  for (let i = 0; i < len; i += 4) {
    // Convert RGB to luminance (Y) using Rec. 601 coefficients
    const y1 = 0.299 * f1.data[i] + 0.587 * f1.data[i + 1] + 0.114 * f1.data[i + 2];
    const y2 = 0.299 * f2.data[i] + 0.587 * f2.data[i + 1] + 0.114 * f2.data[i + 2];
    diff += Math.abs(y1 - y2) / 255;
  }
  return diff / (len / 4);
};

/**
 * Detect a replay‑attack (static image or looping video) by analysing recent frames.
 * Returns true if the average change between the last three frames is lower than 5%.
 */
export const isReplayAttack = (recentFrames: ImageData[]): boolean => {
  if (recentFrames.length < 3) return false;
  const [a, b, c] = recentFrames.slice(-3);
  const diffAB = frameDiff(a, b);
  const diffBC = frameDiff(b, c);
  // Threshold of 0.05 (5%) indicates very little motion
  return diffAB < 0.05 && diffBC < 0.05;
};

export const detectMouthOpen = (landmarks: faceapi.FaceLandmarks68): boolean => {
  const mouth = landmarks.getMouth();
  
  const dist = (p1: faceapi.Point, p2: faceapi.Point) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
  
  // Tính khoảng cách chiều dọc giữa các điểm môi trong (inner lips)
  const v1 = dist(mouth[13], mouth[19]);
  const v2 = dist(mouth[14], mouth[18]);
  const v3 = dist(mouth[15], mouth[17]);
  
  // Tính khoảng cách chiều ngang giữa 2 mép miệng ngoài (outer lips)
  const h = dist(mouth[0], mouth[6]);
  
  if (h === 0) return false;
  
  // Mouth Aspect Ratio (MAR) chuẩn
  const mar = (v1 + v2 + v3) / (3.0 * h);
  
  // Tăng ngưỡng lên 0.4 (thay vì 0.15) để chỉ bắt lỗi video spoof 
  // khi miệng há thực sự rất to (ví dụ: đang ngáp to, la hét). 
  // Tránh lỗi người dùng hé môi thở hoặc đang nói chuyện nhẹ cũng bị cấm chấm công.
  return mar > 0.4;
};

/**
 * Detect flat screen (phone/monitor) using Depth-Estimation model.
 * A real face has high depth variance; a flat screen is nearly uniform depth.
 * Returns true if the scene appears to be a flat surface (screen spoof).
 */
export const isFlatScreen = async (
  canvas: HTMLCanvasElement,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any
): Promise<boolean> => {
  try {
    const tf = await import("@tensorflow/tfjs");
    const tensor = tf.browser.fromPixels(canvas);
    const depthMap = await model.estimateDepth(tensor);
    tensor.dispose();

    const depthTensor = depthMap.toTensor ? depthMap.toTensor() : depthMap;
    const { variance } = tf.moments(depthTensor);
    const varianceValue = (await variance.data())[0];
    variance.dispose();
    depthTensor.dispose?.();

    // Real face variance > 0.005; flat screen < 0.001
    return varianceValue < 0.001;
  } catch {
    return false;
  }
};


/**
 * Detect screen/display by analysing high-frequency pixel patterns (Moiré effect).
 *
 * Screens emit repetitive pixel grid patterns that create abnormally high
 * horizontal/vertical frequency ratios when captured through another camera.
 *
 * Algorithm:
 *  1. Sample a 64×64 region from the face bounding box area on the canvas.
 *  2. Compute horizontal & vertical gradient energy (sum of |pixel[i] - pixel[i+1]|).
 *  3. If the ratio of h-energy / v-energy is outside a natural face range [0.6, 1.6],
 *     or if the absolute energy is abnormally high (>12 per pixel on avg), flag as screen.
 *
 * Returns true if a screen/display pattern is detected.
 */
export const detectMoirePattern = (canvas: HTMLCanvasElement): boolean => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width < 64 || canvas.height < 64) return false;

    // Sample 64×64 from center of canvas
    const sampleSize = 64;
    const startX = Math.max(0, Math.floor((canvas.width - sampleSize) / 2));
    const startY = Math.max(0, Math.floor((canvas.height - sampleSize) / 2));
    const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
    const data = imageData.data;

    // Convert to grayscale luminance array
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }

    // Horizontal gradient energy
    let hEnergy = 0;
    for (let row = 0; row < sampleSize; row++) {
      for (let col = 0; col < sampleSize - 1; col++) {
        hEnergy += Math.abs(gray[row * sampleSize + col] - gray[row * sampleSize + col + 1]);
      }
    }

    // Vertical gradient energy
    let vEnergy = 0;
    for (let row = 0; row < sampleSize - 1; row++) {
      for (let col = 0; col < sampleSize; col++) {
        vEnergy += Math.abs(gray[row * sampleSize + col] - gray[(row + 1) * sampleSize + col]);
      }
    }

    const totalPixels = sampleSize * sampleSize;
    const avgHEnergy = hEnergy / totalPixels;
    const avgVEnergy = vEnergy / totalPixels;
    const ratio = avgHEnergy / (avgVEnergy || 1);

    // Screen patterns have skewed H/V ratio and high overall energy
    const isSkewedRatio = ratio < 0.55 || ratio > 1.7;
    const isHighEnergy = avgHEnergy > 14 || avgVEnergy > 14;

    return isSkewedRatio && isHighEnergy;
  } catch {
    return false;
  }
};
