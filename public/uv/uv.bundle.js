/* global self */

// Ultravioletのクライアント側スクリプト
// このファイルはブラウザで直接実行されます

// 設定
self.__uv$config = {
  prefix: '/service/',
  bare: '/bare/',
  encodeUrl: (url) => {
    // シンプルなXOR暗号化を行う関数
    const xor = {
      encode: (str) => {
        // シンプルなXOR暗号化
        let result = '';
        for (let i = 0; i < str.length; i++) {
          result += String.fromCharCode(str.charCodeAt(i) ^ 3); // 3はXORキー
        }
        return btoa(result).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      },
      decode: (str) => {
        try {
          // Base64デコード
          str = str.replace(/-/g, '+').replace(/_/g, '/');
          while (str.length % 4) str += '=';
          str = atob(str);
          
          // XORデコード
          let result = '';
          for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ 3); // 3はXORキー
          }
          return result;
        } catch (e) {
          return '';
        }
      }
    };
    
    return xor.encode(url);
  },
  decodeUrl: (encodedUrl) => {
    // シンプルなXOR暗号化を行う関数 (上記と同じ)
    const xor = {
      encode: (str) => {
        let result = '';
        for (let i = 0; i < str.length; i++) {
          result += String.fromCharCode(str.charCodeAt(i) ^ 3);
        }
        return btoa(result).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      },
      decode: (str) => {
        try {
          str = str.replace(/-/g, '+').replace(/_/g, '/');
          while (str.length % 4) str += '=';
          str = atob(str);
          
          let result = '';
          for (let i = 0; i < str.length; i++) {
            result += String.fromCharCode(str.charCodeAt(i) ^ 3);
          }
          return result;
        } catch (e) {
          return '';
        }
      }
    };
    
    return xor.decode(encodedUrl);
  }
};

// グローバルに公開
self.Ultraviolet = {
  codec: {
    xor: {
      encode: self.__uv$config.encodeUrl,
      decode: self.__uv$config.decodeUrl
    }
  }
};

// サービスワーカー登録
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/uv/sw.js', {
    scope: '/service/',
    updateViaCache: 'none'
  }).catch(err => {
    console.error('サービスワーカー登録エラー:', err);
  });
}