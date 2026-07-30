-- プラン人数上限の改定（Free 2 / Starter 10 / Pro 30、それ以上はお問い合わせ）に伴い、
-- 新規チームの teams.max_members デフォルトを Free の新上限 2 に変更する。
--
-- 既存チームの max_members は「据え置き（グランドファーザー）」とし、ここでは強制更新しない。
--  - 既存の運用/テストチームを壊さないため。
--  - プラン変更時は webhook が plans.ts の値で max_members を上書きするので、以後は自動同期される。
-- 特定チームを新上限へ今すぐ合わせたい場合は個別に UPDATE すること。

ALTER TABLE teams ALTER COLUMN max_members SET DEFAULT 2;
