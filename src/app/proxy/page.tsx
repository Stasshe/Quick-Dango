'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Script from 'next/script';
import { registerUVServiceWorker } from '@/utils/ultraviolet';

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const encodedUrl = searchParams.get('url') || '';
  const [originalUrl, setOriginalUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ultravioletスクリプトをロードする
    const loadUvScript = async () => {
      try {
        console.log('プロキシページ：Ultravioletスクリプトを読み込み中...');
        
        // Ultravioletの初期化と、サービスワーカーの登録を待つ
        await new Promise<void>((resolve, reject) => {
          // グローバルUltravioletオブジェクトが利用可能になるのを待つ
          const checkUv = setInterval(async () => {
            if (window.Ultraviolet) {
              console.log('プロキシページ：Ultravioletが初期化されました');
              clearInterval(checkUv);
              
              // サービスワーカーを登録
              const registered = await registerUVServiceWorker();
              if (!registered) {
                console.warn('サービスワーカーの登録に失敗しました');
              }
              
              resolve();
            }
          }, 100);
          
          // 5秒後にタイムアウト
          setTimeout(() => {
            if (!window.Ultraviolet) {
              console.warn('プロキシページ：Ultravioletの初期化がタイムアウトしました');
              clearInterval(checkUv);
              resolve(); // タイムアウトしても続行
            }
          }, 5000);
        });

        // 元のURLを取得する（可能であれば）
        try {
          // グローバルUltravioletオブジェクトにアクセス
          if (window.Ultraviolet?.codec?.xor && encodedUrl) {
            console.log('プロキシページ：エンコードされたURLを復号中:', encodedUrl);
            const decodedUrl = window.Ultraviolet.codec.xor.decode(decodeURIComponent(encodedUrl));
            console.log('プロキシページ：復号されたURL:', decodedUrl);
            setOriginalUrl(decodedUrl);
          } else {
            console.warn('プロキシページ：Ultravioletが正しく初期化されていないか、URLが不正です');
            setError('Ultravioletの初期化に失敗したか、URLが無効です');
          }
        } catch (err) {
          console.error('プロキシページ：URLのデコードエラー:', err);
          setError('URLの処理中にエラーが発生しました');
        }

        // iframeを作成してプロキシURLを読み込む
        const iframe = document.getElementById('proxy-iframe') as HTMLIFrameElement;
        if (iframe && encodedUrl) {
          console.log('プロキシページ：iframeにURLをロード:', `/service/${encodedUrl}`);
          iframe.src = `/service/${encodedUrl}`;
          iframe.onload = () => {
            console.log('プロキシページ：iframeのコンテンツが読み込まれました');
            setIsLoading(false);
          };
          iframe.onerror = (err) => {
            console.error('プロキシページ：iframeの読み込みエラー:', err);
            setError('コンテンツの読み込みに失敗しました');
            setIsLoading(false);
          };
          
          // 10秒後のタイムアウト処理（iframeのロードが完了しない場合）
          setTimeout(() => {
            if (isLoading) {
              console.warn('プロキシページ：iframeのロードがタイムアウトしました');
              setIsLoading(false);
            }
          }, 10000);
        } else {
          console.warn('プロキシページ：iframe要素が見つからないか、URLが未指定です');
          setIsLoading(false);
          if (!encodedUrl) {
            setError('URLが指定されていません');
          }
        }
      } catch (error) {
        console.error('プロキシページ：読み込みエラー:', error);
        setError(error instanceof Error ? error.message : '未知のエラーが発生しました');
        setIsLoading(false);
      }
    };

    if (encodedUrl) {
      loadUvScript();
    } else {
      setIsLoading(false);
    }

    // クリーンアップ
    return () => {
      const iframe = document.getElementById('proxy-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = 'about:blank';
      }
    };
  }, [encodedUrl, isLoading]);

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
      {/* Ultravioletスクリプトの読み込み - 正しい順序で読み込むことが重要 */}
      <Script src="/uv/uv.bundle.js" strategy="beforeInteractive" />
      <Script src="/uv/uv.config.js" strategy="beforeInteractive" />
      <Script src="/uv/uv.handler.js" strategy="beforeInteractive" />
      
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
      
      <iframe
        id="proxy-iframe"
        className={`flex-1 w-full ${isLoading || error ? 'hidden' : 'block'}`}
        title="Proxied Content"
        sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
      ></iframe>
    </div>
  );
}