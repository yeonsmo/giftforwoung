import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Step 10: tune serverless function limits / image domains here.
  // Large file uploads (video) bypass the 4.5MB serverless payload limit by
  // uploading directly to Cloud Storage (Supabase Storage or Vercel Blob) and
  // passing the resulting URL to the analysis engine. See lib/storage (later steps).
};

export default nextConfig;
