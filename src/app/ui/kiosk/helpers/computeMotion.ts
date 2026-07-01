import * as tf from "@tensorflow/tfjs";

/**
 * Compute motion between two ImageData frames.
 * Returns a normalized value 0‑1 where smaller values mean less motion.
 */
export const computeMotion = (prev: ImageData, cur: ImageData): number => {
  const prevTensor = tf.browser.fromPixels(prev);
  const curTensor = tf.browser.fromPixels(cur);
  const diff = tf.abs(tf.sub(prevTensor, curTensor));
  const mean = diff.mean().arraySync() as number; // 0‑255 range average per channel
  // Normalize to 0‑1
  return mean / 255;
};
