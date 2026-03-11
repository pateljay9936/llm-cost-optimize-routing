/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@llm-router/core", "@llm-router/db", "@llm-router/ui"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  onDemandEntries: {
    // Keep pages in memory longer so they don't need recompilation
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "better-sqlite3"];
    }
    // Disable webpack persistent cache in dev to prevent stale chunk errors
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
