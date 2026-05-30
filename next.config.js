const withPWA = require('next-pwa')({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // 自動生成される sw.js に importScripts で push handler を読み込ませる
  importScripts: ['/sw-push.js'],
  // App Router で生成されるが本番では配信されないファイルを precache 対象から除外。
  // これらが含まれていると workbox の install ステップが 404 で失敗し SW が activated にならない。
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);

