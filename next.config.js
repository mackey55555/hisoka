const withPWA = require('next-pwa')({
  dest: 'public',
  register: process.env.NODE_ENV === 'production',
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);

