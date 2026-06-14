import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // "standalone" bundles a self-contained Node server (.next/standalone/server.js)
  // so the app can run locally inside the Electron desktop build without Vercel.
  // It is also compatible with a normal Vercel deployment.
  output: "standalone",
  // Large file uploads (video) bypass the 4.5MB serverless payload limit by
  // uploading directly to Cloud Storage (Supabase Storage or Vercel Blob) and
  // passing the resulting URL to the analysis engine. See lib/storage (later steps).
};

export default nextConfig;
