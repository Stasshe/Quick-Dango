import { Ultraviolet } from '@titaniumnetwork-dev/ultraviolet';
import { BareClient } from '@tomphttp/bare-client';

let ultraviolet: Ultraviolet | null = null;
let bareClient: BareClient | null = null;

// Ultravioletインスタンスを初期化する関数
export const initUltraviolet = async () => {
  // ブラウザ環境でのみ実行
  if (typeof window === 'undefined') return;

  if (!bareClient) {
    // Bare Serverに接続
    bareClient = new BareClient('/bare/');
  }

  if (!ultraviolet) {
    // Ultravioletインスタンスを作成
    ultraviolet = new Ultraviolet({
      bare: bareClient,
      prefix: '/service/',
    });
  }

  return ultraviolet;
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