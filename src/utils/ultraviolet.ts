import { createBareClient } from '@tomphttp/bare-client';

// 型定義
interface UVConfig {
  bare: any;
  prefix: string;
}

interface UVInstance {
  encodeUrl: (url: string) => string;
  decodeUrl: (encodedUrl: string) => string;
}

// グローバルUltravioletオブジェクトの型定義
declare global {
  interface Window {
    Ultraviolet?: {
      codec: {
        xor: {
          encode: (url: string) => string;
          decode: (encodedUrl: string) => string;
        }
      }
    }
  }
}

let uvInstance: UVInstance | null = null;
let bareClient: any = null;

// Ultravioletインスタンスを初期化する関数
export const initUltraviolet = async () => {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') return null;

  if (!bareClient) {
    // Bare Serverに接続
    bareClient = createBareClient('/bare/');
  }

  if (!uvInstance) {
    // クライアント側でUltravioletスクリプトを動的に読み込む
    try {
      // グローバルに登録されたUltravioletを使用
      const Ultraviolet = (window as any).Ultraviolet;
      
      if (!Ultraviolet) {
        console.error('Ultravioletが読み込まれていません');
        return null;
      }

      // コンフィグを使用してインスタンス化
      const uvConfig: UVConfig = {
        bare: bareClient,
        prefix: '/service/'
      };
      
      uvInstance = {
        encodeUrl: (url: string) => Ultraviolet.codec.xor.encode(url),
        decodeUrl: (encodedUrl: string) => Ultraviolet.codec.xor.decode(encodedUrl)
      };
    } catch (err) {
      console.error('Ultravioletの初期化エラー:', err);
      return null;
    }
  }

  return uvInstance;
};

// URLを処理する関数
export const processUrl = (input: string): string => {
  // 入力がURLかどうかをチェック
  let url: URL;
  try {
    // URLスキームがなければ追加
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'https://' + input;
    }
    url = new URL(input);
    return input;
  } catch (err) {
    // URLでなければ検索クエリとして扱う
    return `https://www.bing.com/search?q=${encodeURIComponent(input)}`;
  }
};

// Ultravioletでページを開く関数
export const openInUltraviolet = async (url: string): Promise<string> => {
  const uv = await initUltraviolet();
  if (!uv) throw new Error('Ultravioletが初期化されていません');
  
  const processedUrl = processUrl(url);
  
  // Ultravioletでプロキシするための処理済みURLを返す
  return uv.encodeUrl(processedUrl);
};