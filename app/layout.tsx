import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HISOKA - 数字に表れない、人の価値を経営に届ける',
  description:
    'KPIの達成はAIがやる時代。数字に表れない現場のがんばりと人らしさ（定性）を、AIが伴走しながら可視化し、経営に届ける目標管理ツール。',
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

