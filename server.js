const { createServer } = require('http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const next = require('next');
const axios = require('axios'); // node-fetchの代わりにaxiosを使用
const { URLPattern } = require('urlpattern-polyfill');
const { rewriteHtml, resolveUrl } = require('./server-utils'); // サーバー側utilsをインポート

// 本番環境かどうかを確認
const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

// Next.jsアプリの初期化
const app = next({ dev });
const handle = app.getRequestHandler();

// モダンなUser-Agent
const MODERN_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// キャッシュ設定
const CACHE_TTL = 300; // 5分キャッシュ
const responseCache = new Map();

// MIMEタイプマッピング
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.txt': 'text/plain'
};

// 拡張子に基づいてMIMEタイプを取得
function getMimeType(path) {
  const ext = path.match(/\.[^.]*$/)?.[0]?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// プロキシリクエスト処理関数
async function handleProxyRequest(req, res, targetUrl) {
  try {
    console.log(`プロキシリクエスト：${targetUrl}`);
    
    // キャッシュチェック (GETリクエストのみ)
    const cacheKey = `${req.method}:${targetUrl}`;
    if (req.method === 'GET' && responseCache.has(cacheKey)) {
      const cachedData = responseCache.get(cacheKey);
      if (Date.now() < cachedData.expiry) {
        console.log(`キャッシュからレスポンス: ${targetUrl}`);
        Object.entries(cachedData.headers).forEach(([key, value]) => {
          if (value) res.setHeader(key, value);
        });
        return res.end(cachedData.body);
      } else {
        responseCache.delete(cacheKey);
      }
    }
    
    // URLをClean-upして正規化
    let normalizedUrl = targetUrl;
    
    // 相対URLを絶対URLに変換（リファラーから）
    if (!normalizedUrl.startsWith('http')) {
      const referer = req.headers.referer;
      if (referer) {
        try {
          normalizedUrl = resolveUrl(referer, normalizedUrl);
        } catch (err) {
          console.error('URL解決エラー:', err);
        }
      }
    }
    
    // URLの正規化
    try {
      normalizedUrl = new URL(normalizedUrl).toString();
    } catch (err) {
      console.error('URL正規化エラー:', err);
    }
    
    // コンテンツタイプ推測
    let contentType = getMimeType(normalizedUrl);
    
    // リクエストヘッダーの設定
    const headers = {
      'User-Agent': MODERN_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
      'DNT': '1',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Connection': 'keep-alive'
    };
    
    // Refererヘッダーの設定
    try {
      const url = new URL(normalizedUrl);
      headers['Referer'] = url.origin;
    } catch (e) {
      console.error('Referer設定エラー:', e);
    }
    
    // 元のリクエストヘッダーから必要なものをコピー
    const headersToCopy = ['cookie', 'content-type'];
    headersToCopy.forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header];
      }
    });
    
    let requestData = null;
    
    // POSTリクエストの場合、ボディを転送
    if (req.method === 'POST' && req.headers['content-type']) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      requestData = Buffer.concat(chunks);
    }
    
    // タイムアウト設定
    const timeout = 8000; // 8秒
    
    // axiosで処理
    const axiosConfig = {
      method: req.method,
      url: normalizedUrl,
      headers: headers,
      responseType: 'arraybuffer',
      timeout: timeout,
      maxRedirects: 5,
      validateStatus: null, // すべてのHTTPレスポンスコードを処理
      ...(requestData && { data: requestData })
    };
    
    const response = await axios(axiosConfig);
    
    // ステータスコードを設定
    res.statusCode = response.status;
    
    // レスポンスヘッダーの設定
    const responseHeaders = {};
    Object.entries(response.headers).forEach(([key, value]) => {
      // 一部のヘッダーは転送しない
      if (!['content-encoding', 'content-security-policy', 'content-length', 'x-frame-options', 'strict-transport-security'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
        responseHeaders[key] = value;
      }
    });
    
    // CORS ヘッダーを追加
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // コンテンツタイプを取得（ヘッダーから）
    contentType = response.headers['content-type'] || contentType;
    
    // レスポンスデータ
    const responseData = response.data;
    
    // HTMLコンテンツはパースして変換する
    if (contentType.includes('text/html')) {
      // バイナリデータをテキストに変換
      const text = responseData.toString('utf-8');
      
      // HTML変換処理（サーバー側ユーティリティを使用）
      const transformedHtml = rewriteHtml(text, normalizedUrl);
      
      // HTML変換後のコンテンツをキャッシュ (GETリクエストのみ)
      if (req.method === 'GET') {
        responseCache.set(cacheKey, {
          headers: responseHeaders,
          body: transformedHtml,
          expiry: Date.now() + CACHE_TTL * 1000
        });
      }
      
      return res.end(transformedHtml);
    } 
    // CSS、JavaScript、JSON、テキストコンテンツなどは変換処理を行う
    else if (contentType.includes('text/css') || contentType.includes('application/javascript') || 
             contentType.includes('application/json') || contentType.includes('text/plain')) {
      let text = responseData.toString('utf-8');
      
      // スタイルシートのURL修正
      if (contentType.includes('text/css')) {
        // url()関数内のパスを絶対URLに変換
        text = text.replace(/url\(['"]?([^'")]+)['"]?\)/g, (match, url) => {
          if (url.startsWith('data:') || url.startsWith('http')) {
            return match;
          }
          try {
            const absoluteUrl = resolveUrl(normalizedUrl, url);
            return `url("/custom-proxy?url=${encodeURIComponent(absoluteUrl)}")`;
          } catch (err) {
            console.error('CSS URL変換エラー:', err);
            return match;
          }
        });
      }
      
      // JavaScript内のURLは変換しないが、必要に応じて拡張できる
      
      // キャッシュ (GETリクエストのみ)
      if (req.method === 'GET') {
        responseCache.set(cacheKey, {
          headers: responseHeaders,
          body: text,
          expiry: Date.now() + CACHE_TTL * 1000
        });
      }
      
      return res.end(text);
    } 
    // バイナリコンテンツはそのまま転送
    else {
      // バイナリコンテンツをキャッシュ (GETリクエストのみ、サイズ制限あり)
      if (req.method === 'GET' && responseData.length < 5 * 1024 * 1024) { // 5MB以下の場合のみキャッシュ
        responseCache.set(cacheKey, {
          headers: responseHeaders,
          body: responseData,
          expiry: Date.now() + CACHE_TTL * 1000
        });
      }
      
      return res.end(responseData);
    }
  } catch (error) {
    console.error('プロキシエラー:', error.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`プロキシエラー: ${error.message}`);
    }
  }
}

// メインの関数
app.prepare().then(() => {
  // Bare Serverの設定
  const bareServer = createBareServer('/bare/');
  
  // HTTPサーバーの作成
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    
    // BareサーバーのURLパターンに一致する場合、Bareサーバーに処理を委任
    if (bareServer.shouldRoute(req)) {
      return bareServer.routeRequest(req, res);
    }
    
    // カスタムプロキシエンドポイント
    // URLパターンを使用してカスタムエンドポイントのパスを解析
    const customProxyPattern = new URLPattern({ pathname: '/custom-proxy' });
    if (customProxyPattern.test(url)) {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.end('URLパラメータが必要です');
      }
      return handleProxyRequest(req, res, targetUrl);
    }
    
    // その他の静的リソースやAPIリクエストはNext.jsに委任
    return handle(req, res);
  });
  
  // サーバー起動
  server.listen(port, () => {
    console.log(`> 準備完了 - サーバーがhttp://localhost:${port}で起動しました`);
  });
});