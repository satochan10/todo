# ✨ かわいいTodo - やることリスト ✨

子ども向けのかわいいTodoアプリです。

## 機能

- ✅ タスクの追加・削除
- ✅ タスクの完了チェック
- ✅ タスクのフィルター（すべて・残ってる・完了）
- ✅ 完了したタスクをまとめて削除
- ✅ Firebaseで自動保存（どのデバイスでも同期）
- ✅ ポイントシステム（タスク完了でポイント獲得）
- ✅ キャラクター進化システム
- ✅ 特典交換機能（YouTube時間・お金など）
- ✅ 📋 おでかけまえチェック機能
- ✅ **🌅🌙 朝・夜のタスク一括追加機能（管理者モード）**
- ✅ モバイル対応

## ローカル起動方法

### 方法1: HTTPサーバーを使用（推奨）

**Pythonがインストールされている場合:**

```bash
# プロジェクトディレクトリで実行
cd docs
python3 -m http.server 8000

# ブラウザで開く
# http://localhost:8000
```

**ポート8000が既に使用されている場合:**

```bash
# ポート8000を使用しているプロセスを確認
lsof -i :8000
# 出力例:
# COMMAND   PID   USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
# Python  69157 satoru    4u  IPv6 0x5fc91db79d0acee1      0t0  TCP *:irdmi (LISTEN)

# 古いプロセスを終了
kill -9 69157

# 改めてサーバーを起動
python3 -m http.server 8000
```

**または別のポートで起動:**

```bash
python3 -m http.server 3000
# http://localhost:3000 でアクセス
```

### 方法2: Node.jsのhttp-server

```bash
npm install -g http-server
cd docs
http-server

# ブラウザで開く
# http://localhost:8080
```

### 方法3: Live Server（VSCode拡張機能）

1. VSCodeで「Live Server」拡張機能をインストール
2. `docs/index.html`を右クリック
3. 「Open with Live Server」を選択

## 使い方

1. やることを入力欄に書く
2. 「➕ 追加」ボタンを押す（またはEnterキー）
3. 終わったら☑️にチェック
4. 「🗑️ 削除」で削除できます

### 管理者モード

⚙️ 設定ボタンからパスワード `2019` で管理者モードに入ると：
- 🌅 **朝のタスク**: 朝のタスクをまとめて設定して一括追加
- 🌙 **夜のタスク**: 夜のタスクをまとめて設定して一括追加
- ⚙️ **タスク編集**: 朝・夜のタスク内容を管理

## デモ

👉 https://satoru.github.io/02_todo

## ファイル構成

```
docs/
├── index.html     # メインHTMLファイル
├── style.css      # スタイルシート
└── script.js      # JavaScript（機能実装）
```

## 技術スタック

- HTML5
- CSS3（グラデーション、アニメーション）
- Vanilla JavaScript（フレームワーク不使用）
- Firebase（Firestore、リアルタイムデータベース）

## カスタマイズ

色やフォントを変更したい場合は、`style.css`を編集してください。

---

楽しくタスクをこなそう！🎉
