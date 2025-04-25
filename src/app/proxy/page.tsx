'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const encodedUrl = searchParams.get('url') || '';
  const [originalUrl, setOriginalUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Ultravioletスクリプトをロードする
    const loadUvScript = async () => {
      try {
        // UVクライアントスクリプトを読み込み
        const uvScript = document.createElement('script');
        uvScript.src = '/uv/uv.bundle.js';
        document.head.appendChild(uvScript);

        // スクリプトが読み込まれるのを待つ
        await new Promise((resolve) => {
          uvScript.onload = resolve;
        });

        // 元のURLを取得する（可能であれば）
        try {
          // グローバルUltravioletオブジェクトにアクセス
          const uv = (window as any).Ultraviolet;
          if (uv && uv.codec && uv.codec.xor && encodedUrl) {
            const decodedUrl = uv.codec.xor.decode(decodeURIComponent(encodedUrl));
            setOriginalUrl(decodedUrl);
          }
        } catch (err) {
          console.error('URLのデコードエラー:', err);
        }

        // iframeを作成してプロキシURLを読み込む
        const iframe = document.getElementById('proxy-iframe') as HTMLIFrameElement;
        if (iframe && encodedUrl) {
          iframe.src = `/service/${encodedUrl}`;
          iframe.onload = () => setIsLoading(false);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('プロキシページの読み込みエラー:', error);
        setIsLoading(false);
      }
    };

    loadUvScript();

    // クリーンアップ
    return () => {
      const iframe = document.getElementById('proxy-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = 'about:blank';
      }
    };
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
      
      <iframe
        id="proxy-iframe"
        className={`flex-1 w-full ${isLoading ? 'hidden' : 'block'}`}
        title="Proxied Content"
        sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
      ></iframe>
    </div>
  );
}