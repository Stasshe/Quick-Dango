# Rapid Dango

高速で安全なウェブプロキシサービス

## 概要

Rapid Dangoは、Ultravioletを使用した高性能Webプロキシサイトです。このプロキシを使用することで、以下のことが可能になります：

- 制限されたウェブサイトへのアクセス
- プライバシーを保護したブラウジング
- 高速なプロキシ体験

## 特徴

- **モダンなデザイン**: 黒を基調としたスタイリッシュなUI
- **高速なプロキシ**: Ultravioletプロキシエンジンによる高速な読み込み
- **使いやすいインターフェース**: シンプルで直感的な操作性
- **検索機能**: URL入力またはBing検索をサポート

## 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet) - プロキシエンジン
- [TompHTTP Bare Server](https://github.com/tomphttp/bare-server-node) - Bareサーバー実装

## ローカル開発

### 必要条件

- Node.js 18.0.0以上
- npm 9.0.0以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/rapid-dango.git
cd rapid-dango

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### ビルド

```bash
# 本番用ビルド
npm run build

# 本番サーバーの起動
npm start
```

## デプロイ

このプロジェクトはRenderに簡単にデプロイできます：

1. Renderアカウントにログイン
2. 「New Web Service」を選択
3. リポジトリをリンク
4. ビルド設定はrender.yamlに記載済み

## ライセンス

MITライセンス - 詳細はLICENSEファイルを参照してください。
