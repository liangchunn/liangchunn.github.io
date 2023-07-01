const { withContentlayer } = require('next-contentlayer')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  output: 'export',
  images: {
    unoptimized: true
  },
  compiler: {
    styledComponents: true
  }
};

module.exports =  withContentlayer(nextConfig);
