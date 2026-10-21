# ⚡ NEON ARCADE

洗練されたネオンデザインのブラウザゲームサイト。

**マインスイーパー** · **WebRTC 対戦オセロ** · **WebRTC 対戦三目並べ**

[![Live Demo](https://img.shields.io/badge/Live-Demo-00f0ff?style=for-the-badge)](https://r25347sh.github.io/neon-arcade/)

---

## 🎮 ゲーム一覧

### 💣 マインスイーパー
- 初級 / 中級 / 上級の3難易度
- 右クリック（または長押し）で旗を立てる
- クラシックなルール完全再現

### ⚫ 対戦オセロ
- **AI対戦** — コーナー優先の評価関数を持つAI
- **オンライン対戦 (WebRTC)** — ルームコードを共有してリアルタイム対戦
- 有効な手をハイライト表示
- 石がひっくり返るアニメーション

### ❌ 対戦三目並べ
- **ローカル対戦** — 同じ端末で2人プレイ
- **AI対戦** — ブロック＆勝利を狙うAI
- **オンライン対戦 (WebRTC)** — PeerJS による P2P 接続

---

## 🛠 技術スタック

- **Pure Frontend** — HTML / CSS / Vanilla JS
- **WebRTC** — [PeerJS](https://peerjs.com/) でシグナリング不要のP2P
- **デザイン** — CSS変数・グラスモーフィズム・ネオングロー・アニメーション

---

## 🚀 使い方

1. リポジトリをクローン or GitHub Pages で開く
2. トップページからゲームを選択
3. オンライン対戦の場合：
   - 一方が「ルームを作成」→ 表示された6桁コードを相手に伝える
   - もう一方がコードを入力して「参加」

> **注意**: WebRTC は同じネットワーク内または STUN 経由で動作します。PeerJS の無料クラウドサーバーを使用しています。

---

## 📁 構成

```
neon-arcade/
├── index.html          # トップページ
├── css/style.css       # 共通スタイル
├── minesweeper/
│   ├── index.html
│   ├── minesweeper.css
│   └── minesweeper.js
├── othello/
│   ├── index.html
│   ├── othello.css
│   └── othello.js
└── tictactoe/
    ├── index.html
    ├── tictactoe.css
    └── tictactoe.js
```

---

## ✨ デザインのポイント

- 深いダーク背景 + ネオンシアン / マゼンタ / パープルのアクセント
- グラスモーフィズムのカードとパネル
- 浮遊するオーブとグリッド背景
- Orbitron + Noto Sans JP フォント
- ホバー時のグローエフェクトとマイクロインタラクション

---

Made with ❤️ for the love of classic games.
