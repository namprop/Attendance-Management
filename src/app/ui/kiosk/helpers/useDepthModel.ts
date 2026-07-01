import { useEffect, useState } from "react";

// Định nghĩa interface cơ bản cho model để tránh dùng 'any'
export interface DepthEstimationModel {
  estimateDepth(image: unknown): Promise<{
    toTensor?: () => unknown;
    [key: string]: unknown;
  }>;
}

// Định nghĩa interface cho thư viện depthEstimation load từ CDN
interface DepthLib {
  SupportedModels: {
    ARPortraitDepth: string;
  };
  load(config: { modelType: string }): Promise<DepthEstimationModel>;
}

interface WindowWithDepth extends Window {
  depthEstimation?: DepthLib;
}

/**
 * Hook to load the ARPortraitDepth depth-estimation model once on mount via CDN.
 * Returns the model instance or null if WebGL2 is unavailable / load fails.
 */
export const useDepthModel = (): DepthEstimationModel | null => {
  const [model, setModel] = useState<DepthEstimationModel | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await import("@tensorflow/tfjs-backend-webgl");

        await tf.setBackend("webgl");
        await tf.ready();

        // Check WebGL2 support
        const gl = document.createElement("canvas").getContext("webgl2");
        if (!gl) {
          console.warn("[DepthModel] WebGL2 not supported – depth check disabled");
          return;
        }

        // Dynamically load depth-estimation from CDN to bypass Next.js/Turbopack build errors
        // with mediapipe dependencies
        const globalWindow = window as unknown as WindowWithDepth;
        if (!globalWindow.depthEstimation) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/depth-estimation";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const depthLib = globalWindow.depthEstimation;
        if (!depthLib) {
          throw new Error("depthEstimation not found on window");
        }

        const loadedModel = await depthLib.load({
          modelType: depthLib.SupportedModels.ARPortraitDepth,
        });

        if (!cancelled) {
          setModel(loadedModel);
          console.info("[DepthModel] Loaded successfully via CDN");
        }
      } catch (e) {
        console.error("[DepthModel] Load error:", e);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  return model;
};
