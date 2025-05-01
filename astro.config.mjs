import { defineConfig } from 'astro/config';
// Removed unused node import
import vercel from "@astrojs/vercel/serverless";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [react()],
  // Explicitly point to the root tsconfig.json
  tsconfigPath: './tsconfig.json'
});