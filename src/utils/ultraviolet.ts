/**
 * シンプルなプロキシユーティリティ
 * サーバーサイドの実装と連携します
 */

// URLエンコード/デコード関数
export const encodeUrl = (url: string): string => {
  // Base64エンコードを使用（ブラウザ環境用）
  return btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const decodeUrl = (encoded: string): string => {
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
  if (!input.trim()) return '';
  
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
 * サーバーと同じエンコード方式を使用
 */
export const generateProxyUrl = (url: string): string => {
  const processedUrl = processUrl(url);
  return encodeUrl(processedUrl);
};

/**
 * プロキシURLをデコード
 */
export const decodeProxyUrl = (encodedUrl: string): string => {
  return decodeUrl(encodedUrl);
};

/**
 * URLパス解決のヘルパー関数
 */
const resolveUrl = (baseUrl: string, path: string): string => {
  try {
    // URLのベース部分を取得
    const url = new URL(baseUrl);
    const basePath = url.pathname.split('/').slice(0, -1).join('/') + '/';
    
    // パスが絶対URLまたは/で始まるか確認
    if (path.startsWith('http') || path.startsWith('//')) {
      return path;
    } else if (path.startsWith('/')) {
      // ルート相対パス
      return `${url.origin}${path}`;
    } else {
      // 相対パス
      return `${url.origin}${basePath}${path}`;
    }
  } catch (e) {
    console.error('URLパス解決エラー:', e);
    return path;
  }
};

/**
 * HTML内のリンクをプロキシで処理するためのコンテンツ変換関数
 * この関数はサーバーサイドでのみ使用され、クライアントバンドルには含まれません
 */
export const rewriteHtml = (html: string, baseUrl: string): string => {
  // 簡易的なHTMLパース（フルパースを避けて高速化）
  
  // <a>タグのhref属性を書き換え
  let result = html.replace(/(<a[^>]*href=["'])([^"']+)(["'][^>]*>)/gi, 
    (match, prefix, url, suffix) => {
      try {
        // 空のURLや javascript: はそのまま
        if (!url || url.startsWith('javascript:') || url.startsWith('#')) {
          return match;
        }
        
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, url);
        // プロキシURLに変換
        const proxyUrl = `/proxy?url=${encodeURIComponent(generateProxyUrl(absoluteUrl))}`;
        return `${prefix}${proxyUrl}${suffix}`;
      } catch {
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  // <form>タグのaction属性を書き換え
  result = result.replace(/(<form[^>]*action=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, url, suffix) => {
      try {
        // 空のURLや javascript: はそのまま
        if (!url || url.startsWith('javascript:') || url.startsWith('#')) {
          return match;
        }
        
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, url);
        // プロキシURLに変換
        const proxyUrl = `/proxy?url=${encodeURIComponent(generateProxyUrl(absoluteUrl))}`;
        return `${prefix}${proxyUrl}${suffix}`;
      } catch {
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  // <img>, <script>, <link>タグのsrc/href属性を絶対URLに書き換え
  result = result.replace(/(<(?:img|script|link|iframe)[^>]*(?:src|href)=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, url, suffix) => {
      if (!url || url.startsWith('data:') || url.startsWith('#') || url.startsWith('javascript:')) {
        return match; // データURLや特殊URLはそのまま
      }
      
      try {
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, url);
        // プロキシサーバー経由のURLに変換
        return `${prefix}/custom-proxy?url=${encodeURIComponent(absoluteUrl)}${suffix}`;
      } catch {
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  // CSSのインポートやスタイルタグ内のurl()を書き換え
  result = result.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, openTag, content, closeTag) => {
      // スタイル内のURL参照を書き換え
      const processedContent = content.replace(/url\(['"]?([^'")]+)['"]?\)/g, (urlMatch: string, urlPath: string) => {
        if (!urlPath || urlPath.startsWith('data:')) {
          return urlMatch; // データURLはそのまま
        }
        
        try {
          // 相対URLを絶対URLに変換
          const absoluteUrl = resolveUrl(baseUrl, urlPath);
          // プロキシサーバー経由のURLに変換
          return `url("/custom-proxy?url=${encodeURIComponent(absoluteUrl)}")`;
        } catch {
          return urlMatch; // エラーが発生した場合は元のまま
        }
      });
      
      return `${openTag}${processedContent}${closeTag}`;
    }
  );
  
  // メタタグのcontent属性内のURLを書き換え（Open Graphなど）
  result = result.replace(/(<meta[^>]*content=["'])([^"']+)(["'][^>]*>)/gi,
    (match, prefix, content, suffix) => {
      // http:// または https:// から始まるURLを含む場合のみ処理
      if (content.match(/https?:\/\/[^\s"']+/)) {
        try {
          // コンテンツ内のURLを抽出して置換
          const processedContent = content.replace(/(https?:\/\/[^\s"']+)/g, (url: string) => {
            // プロキシURLに変換
            return `/proxy?url=${encodeURIComponent(generateProxyUrl(url))}`;
          });
          
          return `${prefix}${processedContent}${suffix}`;
        } catch {
          return match; // エラーが発生した場合は元のまま
        }
      }
      
      return match; // URLを含まない場合はそのまま
    }
  );
  
  // baseタグの挿入
  if (!result.includes('<base') && !result.includes('<BASE')) {
    const headPos = result.toLowerCase().indexOf('<head>');
    const headEndPos = result.toLowerCase().indexOf('</head>');
    
    if (headPos !== -1 && headEndPos !== -1 && headPos < headEndPos) {
      const baseTag = `<base href="${baseUrl}">\n`;
      const cssOverrideTag = `<style>
      /* CORSバイパスのためのプリフェッチ */
      *[rel="stylesheet"][href^="/"]:not([href^="/custom-proxy"]) {
        display: none !important;
      }
      /* デバッグサポート */
      .rapid-dango-debug {
        position: fixed;
        bottom: 0;
        right: 0;
        background: rgba(0,0,0,0.7);
        color: white;
        padding: 5px;
        font-size: 10px;
        z-index: 9999;
      }
      </style>\n`;
      
      result = result.slice(0, headPos + 6) + baseTag + cssOverrideTag + result.slice(headPos + 6);
    }
  }
  
  // すべてのCSSファイルを先読み
  const preloadLinks = [];
  const cssLinkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let cssMatch;
  
  while ((cssMatch = cssLinkRegex.exec(result)) !== null) {
    const cssUrl = cssMatch[1];
    if (cssUrl && !cssUrl.startsWith('data:')) {
      try {
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, cssUrl);
        // プロキシサーバー経由のURL
        const proxiedUrl = `/custom-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        preloadLinks.push(`<link rel="preload" href="${proxiedUrl}" as="style">`);
      } catch {
        // エラーの場合はスキップ
      }
    }
  }
  
  // プリロードリンクをheadに挿入
  if (preloadLinks.length > 0) {
    const headEndPos = result.toLowerCase().indexOf('</head>');
    if (headEndPos !== -1) {
      result = result.slice(0, headEndPos) + preloadLinks.join('\n') + result.slice(headEndPos);
    }
  }
  
  // CSSリンクを修正（一度削除して、正しいパスで再追加）
  result = result.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      if (href.startsWith('data:')) {
        return match; // データURLはそのまま
      }
      
      try {
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, href);
        // プロキシサーバー経由のURL
        const proxiedUrl = `/custom-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        
        // 元のタグから追加属性を抽出
        const mediaAttr = match.match(/media=["']([^"']+)["']/i);
        const mediaStr = mediaAttr ? ` media="${mediaAttr[1]}"` : '';
        
        const typeAttr = match.match(/type=["']([^"']+)["']/i);
        const typeStr = typeAttr ? ` type="${typeAttr[1]}"` : '';
        
        // 新しいlinkタグを生成
        return `<link rel="stylesheet" href="${proxiedUrl}"${mediaStr}${typeStr} data-original-href="${href}">`;
      } catch {
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  return result;
};