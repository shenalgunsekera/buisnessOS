const isExport = process.env.NEXT_OUTPUT_MODE === 'export';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: isExport ? 'export' : undefined,
  trailingSlash: isExport ? true : false,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
