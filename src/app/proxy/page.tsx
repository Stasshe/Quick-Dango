'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { decodeProxyUrl } from '@/utils/ultraviolet';

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const encodedUrl = searchParams.get('url') || '';
  const [originalUrl, setOriginalUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!encodedUrl) {
      setIsLoading(false);
      return;
    }

    const loadContent = async () => {
      try {
        console.log('プロキシページ: エンコードされたURLを処理中:', encodedUrl);
        
        // URLをデコード
        const decodedUrl = decodeProxyUrl(decodeURIComponent(encodedUrl));
        console.log('プロキシページ: デコードされたURL:', decodedUrl);
        
        if (!decodedUrl) {
          throw new Error('URLのデコードに失敗しました');
        }
        
        setOriginalUrl(decodedUrl);
        
        // カスタムプロキシエンドポイントでURLをプロキシ
        if (iframeRef.current) {
          // 前回のタイムアウトをクリア
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          
          // プログレッシブローディングのためのタイムアウト
          // 8秒後に強制的にローディングを終了
          loadingTimeoutRef.current = setTimeout(() => {
            if (isLoading) {
              console.log('タイムアウトによりローディング状態を終了します');
              setIsLoading(false);
            }
          }, 8000);
          
          // 正規化されたURL
          const normalizedUrl = decodedUrl.trim().replace(/\/$/, '');
          
          // プロキシURL
          const proxyUrl = `/custom-proxy?url=${encodeURIComponent(normalizedUrl)}`;
          console.log('プロキシURL:', proxyUrl);
          
          // iframeの読み込みイベントを監視
          iframeRef.current.onload = () => {
            console.log('iframeのコンテンツが読み込まれました');
            // タイムアウトをクリア
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }
            // ローディング状態を終了
            setIsLoading(false);
          };
          
          // エラーハンドラを設定
          iframeRef.current.onerror = (e) => {
            console.error('iframeの読み込みエラー:', e);
            setError('コンテンツの読み込みに失敗しました');
            setIsLoading(false);
            
            // タイムアウトをクリア
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }
          };
          
          // srcを設定して読み込み開始
          iframeRef.current.src = proxyUrl;
        }
      } catch (error) {
        console.error('プロキシページエラー:', error);
        setError(error instanceof Error ? error.message : '未知のエラーが発生しました');
        setIsLoading(false);
        
        // タイムアウトをクリア
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      }
    };

    // コンテンツ読み込み実行
    loadContent();
    
    // クリーンアップ関数
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [encodedUrl, isLoading]);

  // URLが指定されていない場合
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
            <p className="text-xs text-gray-400 mt-2">初回読み込みには数秒かかることがあります</p>
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
      
      <iframe
        ref={iframeRef}
        className={`flex-1 w-full ${isLoading || error ? 'hidden' : 'block'}`}
        title="Proxied Content"
        sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
      ></iframe>
    </div>
  );
}