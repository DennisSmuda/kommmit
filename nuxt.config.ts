import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      meta: [{ name: 'apple-mobile-web-app-title', content: 'kommmit' }],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap',
        },
      ],
    },
  },

  // Pinned to IPv4 loopback rather than `localhost`, which on macOS resolves to
  // `::1` alone. It also settles which loopback address AT Protocol sign-in
  // uses: the spec accepts `127.0.0.1` or `[::1]` as the redirect, and it has to
  // be the one the browser is on or the session cookie is set for an origin
  // nothing reads it back from.
  devServer: {
    host: '127.0.0.1',
    port: process.env.NODE_ENV === 'production' ? 3001 : 3000,
  },
  modules: ['@sidebase/nuxt-auth', '@nuxt/ui', '@nuxtjs/i18n'],
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'en',
    locales: [{ code: 'en', name: 'English', file: 'en.ts' }],
  },
  auth: {
    originEnvKey: 'NUXT_AUTH_ORIGIN',
    provider: {
      type: 'authjs',
    },
  },
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
  },
  icon: {
    serverBundle: {
      collections: ['lucide'],
    },
  },
  css: ['~/assets/css/main.css'],

  vite: {
    optimizeDeps: {
      // maplibre-gl loads its own worker via a `new URL(...)` reference that
      // Vite's dep pre-bundler mishandles (the bundled worker chunk 404s),
      // so it's served as-is instead of pre-bundled.
      exclude: ['maplibre-gl'],
    },
    plugins: [
      {
        // The exclude above only fixes dev, where Vite serves node_modules
        // files on request. maplibre-gl resolves its worker, and the worker's
        // own import of its shared chunk, via *dynamic* `./${name}.mjs` URLs
        // that Rollup's static asset analysis can't see, so the production
        // build never emits either file and both 404 under /_nuxt/. Emit
        // them manually at the paths the runtime requests.
        name: 'maplibre-gl-worker-copy',
        apply: 'build',
        generateBundle() {
          for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
            this.emitFile({
              type: 'asset',
              fileName: `_nuxt/${file}`,
              source: readFileSync(
                fileURLToPath(new URL(`./node_modules/maplibre-gl/dist/${file}`, import.meta.url)),
              ),
            })
          }
        },
      },
    ],
  },

  nitro: {
    // @atproto-labs/fetch-node depends on npm-aliased packages (undici_v6/v7/v8).
    // Nitro's node_modules tracer/copy step drops the alias and collides
    // multiple undici versions under one name, so a pruned `.output` boots
    // with "Cannot find package 'undici_v6'". Disabling tracing resolves every
    // external import through the full node_modules directly instead, the
    // same way it already resolves in `nuxt dev`.
    externals: {
      trace: false,
    },
  },

  // No component auto-import: better FSD analysis
  components: false,
})
