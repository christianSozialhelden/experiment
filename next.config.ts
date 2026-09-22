import type { NextConfig } from "next";

// GitHub Pages liefert nur statische Dateien und hostet unter /<repo>.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages
    ? { output: "export", basePath: "/experiment", trailingSlash: true }
    : {}),
  images: {
    unoptimized: isGithubPages,
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
  },
};

export default nextConfig;
