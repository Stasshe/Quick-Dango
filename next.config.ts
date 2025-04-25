import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
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

    // node: プロトコルの処理を追加
    config.resolve.alias = {
      ...config.resolve.alias,
      // node:pathなどのnode:プロトコルを処理するための設定
      'node:path': 'path-browserify',
      'node:url': 'url',
      'node:buffer': 'buffer',
      'node:util': 'util',
    };

    // 必要なポリフィルを提供
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: require.resolve('path-browserify'),
        url: require.resolve('url/'),
        buffer: require.resolve('buffer/'),
        util: require.resolve('util/'),
        stream: require.resolve('stream-browserify'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        os: require.resolve('os-browserify/browser'),
        zlib: require.resolve('browserify-zlib'),
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
  // サービスワーカーとバンドルスクリプトをクライアント側でトランスパイル可能にする
  transpilePackages: ['@titaniumnetwork-dev/ultraviolet', '@tomphttp/bare-client'],
};

export default nextConfig;
