'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { decodeProxyUrl, createBareRequest } from '@/utils/ultraviolet';

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const encodedUrl = searchParams.get('url') || '';
  const [originalUrl, setOriginalUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!encodedUrl) {
      setIsLoading(false);
      return;
    }

    const fetchContent = async () => {
      try {
        console.log('プロキシページ: エンコードされたURLを処理中:', encodedUrl);
        
        // URLをデコード
        const decodedUrl = decodeProxyUrl(decodeURIComponent(encodedUrl));
        console.log('プロキシページ: デコードされたURL:', decodedUrl);
        
        if (!decodedUrl) {
          throw new Error('URLのデコードに失敗しました');
        }
        
        setOriginalUrl(decodedUrl);
        
        // Bare Serverを通じてコンテンツを取得
        const response = await createBareRequest(decodedUrl, {
          method: 'GET',
          headers: {
            'User-Agent': navigator.userAgent,
          },
        });
        
        if (!response.ok) {
          throw new Error(`コンテンツの取得に失敗しました: ${response.status} ${response.statusText}`);
        }
        
        // レスポンスからHTMLを取得
        const html = await response.text();
        
        // コンテンツを表示用の要素に設定
        if (contentRef.current) {
          // コンテンツのベースURLを設定
          const baseEl = document.createElement('base');
          baseEl.href = decodedUrl;
          
          // コンテンツをiframeとして表示（サンドボックス環境で）
          const iframe = document.createElement('iframe');
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.border = 'none';
          
          contentRef.current.innerHTML = '';
          contentRef.current.appendChild(iframe);
          
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            iframeDoc.open();
            
            // ベースURLとプロキシ用のスクリプトを追加
            iframeDoc.write(`
              <base href="${decodedUrl}">
              <style>
                body { margin: 0; padding: 0; }
              </style>
              ${html}
            `);
            
            iframeDoc.close();
            
            // iframeリンククリックをハンドル
            const handleLinks = (doc: Document) => {
              doc.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                  e.preventDefault();
                  const href = link.getAttribute('href');
                  if (href) {
                    const fullUrl = new URL(href, decodedUrl).toString();
                    // 新しいURLをプロキシ化してナビゲート
                    const newEncodedUrl = encodeURIComponent(decodeProxyUrl(fullUrl));
                    window.location.href = `/proxy?url=${newEncodedUrl}`;
                  }
                });
              });
            };
            
            // リンクをハンドリング
            try {
              handleLinks(iframeDoc);
            } catch (e) {
              console.warn('リンクハンドリングエラー:', e);
            }
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('プロキシページエラー:', error);
        setError(error instanceof Error ? error.message : '未知のエラーが発生しました');
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [encodedUrl]);

  if (!encodedUrl) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">URLが指定されていません</h1>
            <p>URLまたは検索語句を入力してください。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header currentUrl={originalUrl} isProxyPage={true} />
      
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
            <p>読み込み中...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="text-red-500 mb-4 text-6xl">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto mb-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-3">エラーが発生しました</h2>
            <p className="mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="btn btn-primary px-4 py-2 rounded-md"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      )}
      
      <div 
        ref={contentRef}
        className={`flex-1 w-full ${isLoading || error ? 'hidden' : 'block'}`}
      ></div>
    </div>
  );
}