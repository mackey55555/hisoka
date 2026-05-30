const withPWA = require('next-pwa')({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // 自動生成される sw.js に importScripts で push handler を読み込ませる
  importScripts: ['/sw-push.js'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);

