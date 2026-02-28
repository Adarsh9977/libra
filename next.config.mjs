/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["googleapis", "openai", "@prisma/client", "pdf-parse", "pdfjs-dist"],
  },
};

export default nextConfig;
