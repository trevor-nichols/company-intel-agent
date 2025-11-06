/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  eslint: {
    dirs: ['app', 'src', 'docs'],
  },
};

export default nextConfig;
