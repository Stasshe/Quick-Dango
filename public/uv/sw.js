// @ts-nocheck
// Ultravioletのサービスワーカー
import { createUltravioletSw } from '@titaniumnetwork-dev/ultraviolet';

// Ultraviolet設定を取得
const sw = createUltravioletSw();

// フェッチイベントをハンドリング
self.addEventListener('fetch', (event) => {
  event.respondWith(
    (async function() {
      // Ultravioletバイパスが必要かどうかを確認
      if (sw.shouldRoute(event)) {
        // リクエストをUltravioletでルーティング
        return await sw.fetch(event);
      }
      
      // 通常のフェッチ処理を実行
      return await fetch(event.request);
    })()
  );
});