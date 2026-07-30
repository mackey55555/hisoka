-- プラン申し込み/問い合わせ（公開フォームからのリード）
-- 現状は運営(SuperAdmin)がチームを発行するクローズド運用のため、
-- /pricing の「このプランで申し込む」はこのテーブルに保存＋運営へメール通知する。
-- 書き込みは server action の service key 経由（匿名の直接書き込みはさせない）。

CREATE TABLE IF NOT EXISTS plan_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan TEXT NOT NULL,                    -- 希望プラン（free/starter/pro）
  company TEXT NOT NULL,                 -- 会社/団体名
  contact_name TEXT NOT NULL,            -- 担当者名
  email TEXT NOT NULL,
  phone TEXT,                            -- 任意
  member_count INTEGER,                  -- 想定人数（任意）
  message TEXT,                          -- 任意
  status TEXT NOT NULL DEFAULT 'new',    -- new/contacted/closed 等（運用用）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plan_inquiries_created ON plan_inquiries(created_at DESC);

-- RLS 有効・ポリシー無し（＝匿名/一般ユーザーからは読めも書けもしない）。
-- 書き込みは service key の admin client のみ、閲覧は将来 SuperAdmin 画面で admin client 経由。
ALTER TABLE plan_inquiries ENABLE ROW LEVEL SECURITY;
