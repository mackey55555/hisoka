import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';

export const metadata: Metadata = {
  title: 'Hisoka（密か） - メンバーの“密かな”非認知能力を見える化する組織開発SaaS',
  description:
    '数字に表れないメンバーの“密かな”がんばりと非認知能力を、AIが見える化。経営・マネージャーはメンバーを深く知り、本人も自分の強みに気づく。会社で使う組織開発／人事SaaS。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Hisoka',
  },
  icons: {
    icon: [
      { url: '/images/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/images/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/images/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#5D7A6E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        {/* appleWebApp の capable: true は古い `apple-mobile-web-app-capable` メタタグを出すため、
            新しい標準である `mobile-web-app-capable` も追加して deprecation 警告を抑える */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* フォントは <link rel="preconnect"> + <link rel="stylesheet"> で読み込む。
            globals.css の @import url(...) より速い（CSSパース待ちが無くなる）。 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap"
        />
      </head>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
