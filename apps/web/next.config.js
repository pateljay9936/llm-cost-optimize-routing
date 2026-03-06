/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@llm-router/core", "@llm-router/db", "@llm-router/ui"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "better-sqlite3"];
    }
    return config;
  },
};

module.exports = nextConfig;
