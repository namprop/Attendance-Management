import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'antd', '@ant-design/icons', '@tensorflow/tfjs', 'ckeditor5', '@ckeditor/ckeditor5-react'],
  },
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        crypto: false,
        path: false,
        os: false,
        canvas: false,
      };
    }
    
    // Bỏ qua cảnh báo "Critical dependency" của face-api
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@vladmandic[\\/]face-api/ },
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/
    ];

    return config;
  },
};

export default nextConfig;
