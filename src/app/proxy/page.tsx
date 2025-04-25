'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { initUltraviolet } from '@/utils/ultraviolet';

export default function ProxyPage() {
  const searchParams = useSearchParams();
  const encodedUrl = searchParams.get('url') || '';
  const [originalUrl, setOriginalUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUv() {
      if (!encodedUrl) {
        setError('URLが指定されていません');
        setLoading(false);
        return;
      }

      try {
        // Ultravioletを初期化
        const uv = await initUltraviolet();
        if (!uv) {
          throw new Error('Ultravioletの初期化に失敗しました');
        }

        // 元のURLを取得して表示
        try {
          const decodedUrl = uv.decodeUrl(decodeURIComponent(encodedUrl));
          setOriginalUrl(decodedUrl);
        } catch (e) {
          console.warn('URLのデコードに失敗しました:', e);
          setOriginalUrl(encodedUrl);
        }

        // <head>にサービスワーカースクリプトを挿入
        const script = document.createElement('script');
        script.src = '/uv/uv.bundle.js';
        document.head.appendChild(script);

        // スタイルシートを挿入してプロキシページ用のスタイルを適用
        const style = document.createElement('style');
        style.textContent = `
          .proxy-iframe {
            border: none;
            width: 100%;
            height: calc(100vh - 56px);
            background: white;
          }
        `;
        document.head.appendChild(style);

        // iframeを作成してUltravioletでプロキシされたサイトを表示
        const iframe = document.createElement('iframe');
        iframe.className = 'proxy-iframe';
        iframe.src = encodedUrl;
        
        const container = document.getElementById('proxy-container');
        if (container) {
          // コンテナ内の既存の子要素をクリア
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }
          container.appendChild(iframe);
        }

        setLoading(false);
      } catch (err) {
        console.error('プロキシエラー:', err);
        setError('プロキシの読み込み中にエラーが発生しました');
        setLoading(false);
      }
    }

    loadUv();
  }, [encodedUrl]);

  return (
    <div className="flex flex-col h-screen">
      <Header currentUrl={originalUrl} isProxyPage={true} />
      
      <div id="proxy-container" className="flex-1">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent mb-4"></div>
              <p>読み込み中...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="bg-red-900/20 text-red-400 p-6 rounded-lg max-w-md">
              <h3 className="text-xl font-medium mb-2">エラーが発生しました</h3>
              <p>{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}