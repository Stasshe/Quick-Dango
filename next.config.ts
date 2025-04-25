import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Ultravioletのサービスワーカーとバンドルスクリプトの処理を設定
    config.module.rules.push({
      test: /\.js$/,
      include: [/public\/uv/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['next/babel'],
        },
      },
    });
    
    return config;
  },
  // サービスワーカーとバンドルスクリプトをクライアント側でトランスパイル可能にする
  transpilePackages: ['@titaniumnetwork-dev/ultraviolet', '@tomphttp/bare-client'],
};

export default nextConfig;
