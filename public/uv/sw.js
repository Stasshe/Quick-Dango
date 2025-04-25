/* global self */

// Ultravioletのサービスワーカー
// このファイルはサービスワーカーとして実行されます

// Bare Serverのベースパス
const bareServerUrl = '/bare/';

// 設定を取得
self.addEventListener('install', (event) => {
  // 新しいサービスワーカーをすぐにアクティブ化
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // サービスワーカーをすぐに制御状態にする
  event.waitUntil(self.clients.claim());
});

// フェッチイベントをハンドリング
self.addEventListener('fetch', (event) => {
  // ルートのチェック - /service/ から始まるリクエストのみを処理
  if (!event.request.url.startsWith(self.location.origin + '/service/')) {
    return;
  }

  event.respondWith(
    (async function() {
      try {
        // URLからエンコードされた部分を抽出
        const url = new URL(event.request.url);
        const encodedUrl = url.pathname.split('/service/')[1];
        
        if (!encodedUrl) {
          return new Response('Invalid URL', { status: 400 });
        }

        // URLをデコード
        let decodedUrl;
        try {
          // デコード関数を実行
          decodedUrl = self.__uv$config.decodeUrl(encodedUrl);
        } catch (err) {
          return new Response('Failed to decode URL', { status: 400 });
        }

        // リクエストを作成
        let requestInit = {
          method: event.request.method,
          headers: new Headers(event.request.headers),
          redirect: event.request.redirect,
          body: event.request.method !== 'GET' && event.request.method !== 'HEAD' ? 
                await event.request.clone().arrayBuffer() : undefined
        };

        // リクエストヘッダーの調整
        requestInit.headers.set('X-Requested-With', 'XMLHttpRequest');
        
        // Bareサーバーにプロキシリクエストを送信
        const bareRequest = {
          method: 'GET',
          headers: {
            'x-bare-url': decodedUrl,
            'x-bare-protocol': new URL(decodedUrl).protocol,
            'x-bare-host': new URL(decodedUrl).hostname,
            'x-bare-path': new URL(decodedUrl).pathname + new URL(decodedUrl).search,
            'x-bare-port': new URL(decodedUrl).port || (new URL(decodedUrl).protocol === 'https:' ? '443' : '80'),
            'x-bare-headers': JSON.stringify(Object.fromEntries(requestInit.headers.entries())),
            'x-bare-forward-headers': JSON.stringify(['cookie', 'user-agent'])
          }
        };

        // Bareサーバーに接続
        const bareResponse = await fetch(bareServerUrl + 'v3/', bareRequest);
        
        if (!bareResponse.ok) {
          return new Response('Bare server error: ' + bareResponse.status, { status: 500 });
        }

        // Bareサーバーのレスポンスからメタデータを取得
        const responseUrl = bareResponse.headers.get('x-bare-location') || decodedUrl;
        const responseStatus = parseInt(bareResponse.headers.get('x-bare-status')) || 200;
        const responseHeaders = new Headers(JSON.parse(bareResponse.headers.get('x-bare-headers') || '{}'));
        
        // コンテンツの取得
        const meta = await bareResponse.json();
        const contentResponse = await fetch(bareServerUrl + 'v3/' + meta.id);
        
        if (!contentResponse.ok) {
          return new Response('Content fetch error: ' + contentResponse.status, { status: 500 });
        }

        // レスポンスを作成して返す
        return new Response(contentResponse.body, {
          status: responseStatus,
          headers: responseHeaders
        });
      } catch (error) {
        console.error('Service worker error:', error);
        return new Response('Service worker error: ' + error.message, { status: 500 });
      }
    })()
  );
});