import * as tf from '@tensorflow/tfjs';

let model: tf.GraphModel | null = null;

/**
 * Load the anti‑spoofing liveness model lazily.
 * Model files are located in the public folder:
 *   /models/anti-spoofing/liveness.json
 */
export const loadLivenessModel = async (): Promise<tf.GraphModel> => {
  if (model) return model;
  try {
    // Prefer WebGL for GPU acceleration; fallback to CPU.
    await tf.setBackend('webgl');
    await tf.ready();
  } catch {
    await tf.setBackend('cpu');
    await tf.ready();
  }
  // Load the graph model from the public path.
  model = await tf.loadGraphModel('/models/anti-spoofing/liveness.json');
  return model;
};

/**
 * Run inference on a canvas or ImageData and return a liveness score (0‑1).
 */
export const predictLiveness = async (
  image: HTMLCanvasElement | ImageData
): Promise<number> => {
  const m = await loadLivenessModel();
  const input = tf.browser.fromPixels(image).toFloat().div(255).expandDims(0);
  const output = (await m.executeAsync(input)) as tf.Tensor;
  const data = await output.data();
  const score = data[0];
  tf.dispose([input, output]);
  return score;
};
