'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateProxyUrl } from '@/utils/ultraviolet';
import Link from 'next/link';

interface HeaderProps {
  currentUrl?: string;
  isProxyPage?: boolean;
}

export default function Header({ currentUrl = '', isProxyPage = false }: HeaderProps) {
  const router = useRouter();
  const [url, setUrl] = useState(currentUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUrl) {
      setUrl(currentUrl);
    }
  }, [currentUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('ヘッダーからURLを処理中:', url);
      
      // URLをエンコード
      const encodedUrl = generateProxyUrl(url);
      console.log('ヘッダーからエンコードされたURL:', encodedUrl);
      
      router.push(`/proxy?url=${encodeURIComponent(encodedUrl)}`);
    } catch (error) {
      console.error('ヘッダーからのプロキシエラー:', error);
      setError(error instanceof Error ? error.message : '未知のエラーが発生しました');
      setLoading(false);
    }
  };

  return (
    <header className="header w-full py-2 px-4 flex items-center gap-3 shadow-md">
      <Link href="/" className="btn btn-secondary rounded-full p-2 flex items-center justify-center" aria-label="ホームに戻る">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </Link>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URLまたは検索語句を入力"
            className="search-input flex-1 rounded-l-md px-4 py-2 focus:ring-2 focus:ring-accent"
            disabled={isProxyPage || loading}
          />
          {!isProxyPage && (
            <button 
              type="submit" 
              className="btn btn-primary px-4 py-2 rounded-r-md"
              disabled={loading}
            >
              {loading ? '...' : '検索'}
            </button>
          )}
        </div>
        
        {error && !isProxyPage && (
          <div className="mt-1 text-red-500 text-xs">
            {error}
          </div>
        )}
      </form>

      <button 
        className="btn btn-secondary rounded-full p-2 flex items-center justify-center"
        onClick={() => {
          if (isProxyPage) {
            // 現在のページをリロード
            window.location.reload();
          }
        }}
        aria-label="リロード"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
        </svg>
      </button>
    </header>
  );
}