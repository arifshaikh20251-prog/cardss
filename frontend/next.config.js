/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api'),
  },
  async rewrites() {
    const rawBackendUrl =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

    if (!rawBackendUrl) return [];

    const target = rawBackendUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
