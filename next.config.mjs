/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/choir-register',
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
};

export default nextConfig;
