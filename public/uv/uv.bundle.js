// @ts-nocheck
import { createUltravioletBundle } from '@titaniumnetwork-dev/ultraviolet';

// Ultravioletバンドルを作成
const bundle = createUltravioletBundle();

// サービスワーカーをブラウザに登録
self.__uv$config = {
  prefix: '/service/',
  bare: '/bare/',
  encodeUrl: bundle.encodeUrl,
  decodeUrl: bundle.decodeUrl,
};

// グローバルにUltravioletバンドルを公開
self.Ultraviolet = bundle;

// サービスワーカー登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/uv/sw.js', {
    scope: '/service/',
  }).catch(err => {
    console.error('サービスワーカー登録エラー:', err);
  });
}