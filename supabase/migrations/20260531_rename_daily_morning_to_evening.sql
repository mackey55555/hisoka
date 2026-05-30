-- daily_morning は実態として「1日1回のリマインダー」だが、運用上 18時の
-- 夕方リマインダーとして使うことに変更したため、daily_evening に統合する。
--
-- 既に daily_evening カラムも存在するので、daily_morning の値を引き継いでから
-- 古い daily_morning を削除し、デフォルト値も TRUE に変更する。

-- 既存ユーザーの設定を引き継ぐ（daily_morning が ON のユーザーは daily_evening も ON）
UPDATE notification_preferences SET daily_evening = daily_morning;

-- 古いカラムを削除
ALTER TABLE notification_preferences DROP COLUMN daily_morning;

-- 新しいデフォルトを TRUE に（旧 daily_morning と同じデフォルト）
ALTER TABLE notification_preferences ALTER COLUMN daily_evening SET DEFAULT TRUE;
