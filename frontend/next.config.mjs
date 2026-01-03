/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: NEXT_PUBLIC_* variables are automatically exposed to the browser
  // No need to manually add them to env object
  
  // Skip static optimization for pages that use client-side only features
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
