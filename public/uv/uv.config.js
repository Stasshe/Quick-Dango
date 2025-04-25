/* global self, Ultraviolet */

// Ultravioletの設定ファイル
self.__uv$config = {
  prefix: '/service/',
  bare: `${location.protocol}//${location.host}/bare/`,
  encodeUrl: Ultraviolet.codec.xor.encode,
  decodeUrl: Ultraviolet.codec.xor.decode,
  handler: '/uv/uv.handler.js',
  bundle: '/uv/uv.bundle.js',
  config: '/uv/uv.config.js',
  sw: '/uv/uv.sw.js',
};