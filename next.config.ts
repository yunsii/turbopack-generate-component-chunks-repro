import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',
  // Mirrors the real app: Next.js native i18n with 20 locales.
  i18n: {
    locales: ['en','de','es','fr','it','pt','ja','ko','ar','nl','id','tr','ru','tw','th','zh','pl','da','nb','vi'],
    defaultLocale: 'en',
  },
  experimental: {
    optimizePackageImports: ['@repro/ui'],
    // Mirrors the real app (lingui v6 + Turbopack). Not known to be required for the bug.
    swcPlugins: [['@lingui/swc-plugin', {}]],
    turbopackFileSystemCacheForBuild: true,
    turbopackChunking: {
      // THE ONLY VARIABLE.
      //   MERGE=1 -> true  -> pages never hydrate (the bug)
      //   MERGE=0 -> false -> everything works
      generateComponentChunks: process.env.MERGE === '1',
    },
  },
}
export default config
