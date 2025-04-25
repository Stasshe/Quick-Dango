/**
 * サーバーサイド用のHTMLリライト機能
 */

// URLパス解決
function resolveUrl(baseUrl, path) {
  try {
    // URLのベース部分を取得
    const url = new URL(baseUrl);
    // パスの前後のスペースを削除
    path = path.trim();
    
    // URLの末尾のスラッシュを処理
    const basePath = url.pathname.endsWith('/') 
      ? url.pathname 
      : url.pathname.split('/').slice(0, -1).join('/') + '/';
    
    // パスが絶対URLまたは/で始まるか確認
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return path;
    } else if (path.startsWith('/')) {
      // ルート相対パス - サイトのルートからの相対パス
      return `${url.origin}${path}`;
    } else {
      // 現在のパスからの相対パス
      return `${url.origin}${basePath}${path}`;
    }
  } catch (e) {
    console.error('URLパス解決エラー:', e, 'ベースURL:', baseUrl, 'パス:', path);
    return path;
  }
}

/**
 * HTML内のリンクをプロキシで処理するためのコンテンツ変換関数
 */
function rewriteHtml(html, baseUrl) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // 最終的な絶対パスのベースURLを設定
  try {
    const url = new URL(baseUrl);
    // 標準化した形式に変換
    baseUrl = url.toString();
  } catch (e) {
    console.error('ベースURLの解析エラー:', e);
  }
  
  console.log('HTML変換開始: ベースURL =', baseUrl);
  
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
        const proxyUrl = `/proxy?url=${encodeURIComponent(Buffer.from(absoluteUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''))}`;
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
        const proxyUrl = `/proxy?url=${encodeURIComponent(Buffer.from(absoluteUrl).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''))}`;
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
        // プロキシサーバー経由のURLに変換（直接/custom-proxyにリダイレクト）
        return `${prefix}/custom-proxy?url=${encodeURIComponent(absoluteUrl)}${suffix}`;
      } catch (err) {
        console.error('リソースURLの変換エラー:', err, 'URL:', url);
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  // CSSのインポートやスタイルタグ内のurl()を書き換え
  result = result.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, openTag, content, closeTag) => {
      // スタイル内のURL参照を書き換え
      const processedContent = content.replace(/url\(['"]?([^'")]+)['"]?\)/g, (urlMatch, urlPath) => {
        if (!urlPath || urlPath.startsWith('data:')) {
          return urlMatch; // データURLはそのまま
        }
        
        try {
          // 相対URLを絶対URLに変換
          const absoluteUrl = resolveUrl(baseUrl, urlPath);
          // プロキシサーバー経由のURLに変換
          return `url("/custom-proxy?url=${encodeURIComponent(absoluteUrl)}")`;
        } catch (err) {
          console.error('CSS URL変換エラー:', err, 'URLパス:', urlPath);
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
          const processedContent = content.replace(/(https?:\/\/[^\s"']+)/g, (url) => {
            // プロキシURLに変換
            return `/proxy?url=${encodeURIComponent(Buffer.from(url).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''))}`;
          });
          
          return `${prefix}${processedContent}${suffix}`;
        } catch {
          return match; // エラーが発生した場合は元のまま
        }
      }
      
      return match; // URLを含まない場合はそのまま
    }
  );
  
  // baseタグの挿入（サイトのルートを設定）
  let baseTagExists = result.toLowerCase().includes('<base');
  
  if (!baseTagExists) {
    const url = new URL(baseUrl);
    const origin = url.origin;
    const path = url.pathname.endsWith('/') ? url.pathname : url.pathname.split('/').slice(0, -1).join('/') + '/';
    const finalBaseUrl = `${origin}${path}`;
    
    const headPos = result.toLowerCase().indexOf('<head>');
    if (headPos !== -1) {
      const baseTag = `<base href="${finalBaseUrl}">\n`;
      result = result.slice(0, headPos + 6) + baseTag + result.slice(headPos + 6);
      baseTagExists = true;
    }
  }
  
  // すべてのCSSファイルを先読み
  const preloadLinks = [];
  const cssLinkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let cssMatch;
  
  while ((cssMatch = cssLinkRegex.exec(result)) !== null) {
    const cssUrl = cssMatch[1];
    if (cssUrl && !cssUrl.includes('custom-proxy') && !cssUrl.startsWith('data:')) {
      try {
        // 相対URLを絶対URLに変換
        const absoluteUrl = resolveUrl(baseUrl, cssUrl);
        // プロキシサーバー経由のURL
        const proxiedUrl = `/custom-proxy?url=${encodeURIComponent(absoluteUrl)}`;
        preloadLinks.push(`<link rel="preload" href="${proxiedUrl}" as="style">`);
      } catch (err) {
        console.error('CSS先読み変換エラー:', err, 'CSS URL:', cssUrl);
        // エラーの場合はスキップ
      }
    }
  }
  
  // CSSリンクを修正（既存のリンクを書き換え）
  result = result.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      if (href.startsWith('data:') || href.includes('custom-proxy')) {
        return match; // データURLや既にプロキシ済みのものはそのまま
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
      } catch (err) {
        console.error('CSSリンク変換エラー:', err, 'href:', href);
        return match; // エラーが発生した場合は元のまま
      }
    }
  );
  
  // DOM操作を追加して、読み込み失敗したCSSを再試行するスクリプト
  const fixCssScript = `
  <script>
    (function() {
      // CSSファイルの読み込みステータスを確認するヘルパー関数
      function checkCssLoaded() {
        var links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(function(link) {
          // CSSが読み込まれなかった場合のフォールバック
          if (!link.sheet && !link.hasAttribute('data-retry')) {
            var originalHref = link.getAttribute('data-original-href');
            if (originalHref) {
              console.log('CSSの読み込みに失敗、再試行:', originalHref);
              var newLink = document.createElement('link');
              newLink.rel = 'stylesheet';
              newLink.href = '/custom-proxy?url=' + encodeURIComponent(new URL(originalHref, window.location.href).href);
              newLink.setAttribute('data-retry', 'true');
              if (link.media) newLink.media = link.media;
              document.head.appendChild(newLink);
            }
          }
        });
      }
      
      // ページ読み込み完了時にチェック
      window.addEventListener('load', checkCssLoaded);
      // 安全のため、少し遅延してもう一度チェック
      setTimeout(checkCssLoaded, 2000);
    })();
  </script>
  `;
  
  // 上記のスクリプトをbodyの終了タグの直前に挿入
  const bodyEndPos = result.toLowerCase().lastIndexOf('</body>');
  if (bodyEndPos !== -1) {
    result = result.slice(0, bodyEndPos) + fixCssScript + result.slice(bodyEndPos);
  }
  
  // プリロードリンクをheadに挿入
  if (preloadLinks.length > 0) {
    const headEndPos = result.toLowerCase().indexOf('</head>');
    if (headEndPos !== -1) {
      result = result.slice(0, headEndPos) + preloadLinks.join('\n') + result.slice(headEndPos);
    }
  }
  
  // 相対パスを検出してURLを書き換えるヘルパー機能をJavaScriptとして追加
  const helperScript = `
  <script>
    (function() {
      // 404エラーになったリソースを検出して修正
      window.addEventListener('error', function(e) {
        var target = e.target;
        if (target.tagName === 'IMG' || target.tagName === 'SCRIPT') {
          var src = target.src;
          if (src && !src.includes('/custom-proxy') && !src.startsWith('data:')) {
            console.log('リソースの読み込みに失敗、プロキシで再試行:', src);
            target.src = '/custom-proxy?url=' + encodeURIComponent(src);
          }
        }
      }, true);
      
      // 動的に追加される要素の属性を監視して修正
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(function(node) {
              if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
                var href = node.getAttribute('href');
                if (href && !href.includes('/custom-proxy') && !href.startsWith('data:')) {
                  node.href = '/custom-proxy?url=' + encodeURIComponent(new URL(href, window.location.href).href);
                }
              }
              if (node.tagName === 'SCRIPT' && node.src) {
                var src = node.getAttribute('src');
                if (src && !src.includes('/custom-proxy') && !src.startsWith('data:')) {
                  node.src = '/custom-proxy?url=' + encodeURIComponent(new URL(src, window.location.href).href);
                }
              }
            });
          }
        });
      });
      
      observer.observe(document, { childList: true, subtree: true });
    })();
  </script>
  `;
  
  // ヘルパースクリプトをbodyの終了タグの直前に挿入
  const finalBodyEndPos = result.toLowerCase().lastIndexOf('</body>');
  if (finalBodyEndPos !== -1) {
    result = result.slice(0, finalBodyEndPos) + helperScript + result.slice(finalBodyEndPos);
  }
  
  return result;
}

module.exports = {
  resolveUrl,
  rewriteHtml
};