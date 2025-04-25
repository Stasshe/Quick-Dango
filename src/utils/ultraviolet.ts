/**
 * シンプルなプロキシユーティリティ
 * Ultravioletを使用せず、Bare Serverを直接使用します
 */

// URLエンコード／デコード用の簡易関数
const simpleEncode = (url: string): string => {
  // Base64エンコードを使用してURLを難読化
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const simpleDecode = (encoded: string): string => {
  try {
    // Base64デコード
    let str = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
  } catch (e) {
    console.error('デコードエラー:', e);
    return '';
  }
};

// グローバルタイプ定義
declare global {
  interface Window {
    // グローバル設定（必要に応じて拡張）
    __rapid_dango_config?: {
      prefix: string;
    };
  }
}

/**
 * URLを処理する関数
 * 入力されたURLまたは検索語句を適切に処理します
 */
export const processUrl = (input: string): string => {
  try {
    // URLスキームがなければ追加
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      // ドメイン形式なら https:// を追加
      if (input.includes('.') && !input.includes(' ')) {
        input = 'https://' + input;
      } else {
        // 検索クエリとして扱う
        return `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
      }
    }
    
    // URLとして解析できるか確認
    new URL(input);
    return input;
  } catch (err) {
    // URLでなければ検索クエリとして扱う
    return `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
  }
};

/**
 * プロキシ用のURLを生成
 * Bare Serverを通じてアクセスするためのURLを返します
 */
export const generateProxyUrl = (url: string): string => {
  const processedUrl = processUrl(url);
  const encodedUrl = simpleEncode(processedUrl);
  return encodedUrl;
};

/**
 * プロキシURLをデコード
 * エンコードされたURLを元のURLに戻します
 */
export const decodeProxyUrl = (encodedUrl: string): string => {
  try {
    return simpleDecode(encodedUrl);
  } catch (err) {
    console.error('プロキシURLのデコードエラー:', err);
    return '';
  }
};

/**
 * BareサーバーへのHTTPリクエストを作成
 * クライアント側でBare Serverにリクエストを送るためのヘルパー関数
 */
export const createBareRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const bareUrl = '/bare/';
  const targetUrl = new URL(url);
  
  // Bareサーバーへのリクエストヘッダーを作成
  const headers = new Headers(options.headers);
  headers.set('x-bare-url', url);
  headers.set('x-bare-host', targetUrl.hostname);
  headers.set('x-bare-protocol', targetUrl.protocol);
  headers.set('x-bare-port', targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80'));
  headers.set('x-bare-path', targetUrl.pathname + targetUrl.search);
  
  // Bareサーバーへリクエスト
  const bareOptions: RequestInit = {
    ...options,
    headers,
  };
  
  return fetch(bareUrl, bareOptions);
};