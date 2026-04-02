/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    // Required for static export — images pre-optimized as WebP in /images/optimized/
    unoptimized: true,
  },
};

module.exports = nextConfig;
