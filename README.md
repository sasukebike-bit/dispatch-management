# 配車管理システム

物流・デリバリー向け自動配車Webアプリ。

前日16時以降に届いたオーダーを、配達員へ時間ブッキングなし・仕事量均等・距離均等の優先順で自動割り当てします。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js (React) |
| バックエンド | Python (FastAPI) |
| DB | PostgreSQL |
| 距離・時間計算 | Google Maps Distance Matrix API |
| PDF出力 | pdf-lib |

## ディレクトリ構成

```
dispatch-management/
├── frontend/   # Next.js
├── backend/    # FastAPI
└── docs/       # 要件定義・設計ドキュメント
```

## 自動配車の優先順位

1. **配達時間の考慮** - 希望時間帯に収まること・時間ブッキングなし
2. **仕事数の平均化** - 配達員ごとのオーダー件数を均等に
3. **距離の平均化** - 配達員ごとの総移動距離を均等に

## セットアップ

### バックエンド

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```
