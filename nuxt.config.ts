// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  css: ['~/assets/css/output.css'],

  app: {
    head: {
      title: 'Soru Kayısı',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Soru Kayısı - Canlı kullanıcı sayacı' }
      ]
    }
  },

  runtimeConfig: {
    public: {
      wsUrl: process.env.NODE_ENV === 'production'
        ? 'wss://sorukayisi.com/ws'
        : 'ws://localhost:8080/ws'
    }
  },

  // Vite configuration
  vite: {
    server: {
      host: true,
      allowedHosts: [
        'sorukayisi.com',
        'www.sorukayisi.com',
        'localhost',
        '5.75.132.32'
      ]
    }
  },

  // Disable devtools in production
  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  // Add specific server configuration
  server: {
    host: '0.0.0.0',
  },

  // Production build settings
  nitro: {
    compressPublicAssets: true,
    minify: true
  },

  compatibilityDate: '2025-03-02'
})