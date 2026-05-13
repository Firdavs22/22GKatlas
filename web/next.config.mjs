/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  // TypeScript errors MUST be caught at build time for production safety
  // If build fails, fix the TS errors before deploying
};

export default nextConfig;
