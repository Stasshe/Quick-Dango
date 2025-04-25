'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { openInUltraviolet, registerUVServiceWorker } from '@/utils/ultraviolet';
import Script from 'next/script';

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uvReady, setUvReady] = useState(false);

  // ページ読み込み時にUltravioletスクリプトを読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') return;

    const loadUvScript = async () => {
      try {
        console.log('Ultravioletの初期化中...');
        
        // すでにUltravioletが初期化されているかチェック
        if (window.Ultraviolet) {
          console.log('Ultravioletはすでに初期化されています');
          // サービスワーカーを登録
          await registerUVServiceWorker();
          setUvReady(true);
          return;
        }
        
        // Ultravioletの初期化を待つ
        const checkUvLoaded = setInterval(async () => {
          if (window.Ultraviolet) {
            console.log('Ultravioletが正常に初期化されました');
            clearInterval(checkUvLoaded);
            
            // サービスワーカーを登録
            const registered = await registerUVServiceWorker();
            if (registered) {
              setUvReady(true);
            } else {
              setError('サービスワーカーの登録に失敗しました');
            }
          }
        }, 100);
        
        // 5秒後にタイムアウト
        setTimeout(() => {
          if (!window.Ultraviolet) {
            console.error('Ultravioletの初期化がタイムアウトしました');
            setError('プロキシの初期化に失敗しました。ページを再読み込みしてください。');
            clearInterval(checkUvLoaded);
          }
        }, 5000);
      } catch (err) {
        console.error('スクリプト読み込みエラー:', err);
        setError('プロキシの初期化に失敗しました。ページを再読み込みしてください。');
      }
    };

    loadUvScript();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('URLを処理中:', url);
      
      if (!window.Ultraviolet) {
        throw new Error('Ultravioletが初期化されていません。ページを再読み込みしてください。');
      }
      
      const encodedUrl = await openInUltraviolet(url);
      console.log('エンコードされたURL:', encodedUrl);
      
      // プロキシページに遷移
      router.push(`/proxy?url=${encodeURIComponent(encodedUrl)}`);
    } catch (error) {
      console.error('プロキシエラー:', error);
      setError(error instanceof Error ? error.message : '未知のエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Ultravioletスクリプトの読み込み - 正しい順序で読み込むことが重要 */}
      <Script src="/uv/uv.bundle.js" strategy="beforeInteractive" />
      <Script src="/uv/uv.config.js" strategy="beforeInteractive" />
      <Script src="/uv/uv.handler.js" strategy="beforeInteractive" />
      
      <Header />
      
      <div className="home-container flex-1 px-4">
        <h1 className="home-title text-center">Rapid Dango</h1>
        <p className="text-center text-gray-300 mb-8">高速で安全なウェブプロキシサービス</p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto">
          <div className="flex flex-col">
            <div className="flex">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="URLまたは検索語句を入力"
                className="search-input flex-1 rounded-l-md px-4 py-3 text-lg focus:ring-2 focus:ring-accent"
              />
              <button 
                type="submit" 
                className="btn btn-primary px-6 py-3 rounded-r-md text-lg font-medium"
                disabled={loading || !uvReady}
              >
                {loading ? '読み込み中...' : '検索'}
              </button>
            </div>
            
            {error && (
              <div className="mt-2 text-red-500 text-sm">
                エラー: {error}
              </div>
            )}
            
            {!uvReady && !error && (
              <div className="mt-2 text-yellow-500 text-sm">
                プロキシを初期化中です...
              </div>
            )}
          </div>
        </form>
        
        <div className="mt-16 text-center">
          <h2 className="text-xl font-semibold mb-4">Rapid Dangoの特徴</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-secondary p-6 rounded-xl">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 className="font-medium mb-2">セキュア</h3>
              <p className="text-sm text-gray-300">あなたの接続は常に暗号化され、ブラウジングの痕跡は残しません。</p>
            </div>
            
            <div className="bg-secondary p-6 rounded-xl">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                </svg>
              </div>
              <h3 className="font-medium mb-2">高速</h3>
              <p className="text-sm text-gray-300">最適化されたプロキシで、スムーズなブラウジング体験を提供します。</p>
            </div>
            
            <div className="bg-secondary p-6 rounded-xl">
              <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>
                  <path d="M9 12h6"></path>
                  <path d="M12 9v6"></path>
                </svg>
              </div>
              <h3 className="font-medium mb-2">自由</h3>
              <p className="text-sm text-gray-300">制限されたコンテンツに簡単にアクセスできます。</p>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-sm text-gray-400">
        <p>© {new Date().getFullYear()} Rapid Dango - 高速で安全なWebプロキシ</p>
      </footer>
    </div>
  );
}
