import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hisoka - 才能発見プラットフォーム',
  description: '目標設定・活動記録・振り返りを通じて、成長の軌跡を可視化するアプリ',
  manifest: '/manifest.json',
  themeColor: '#5D7A6E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

