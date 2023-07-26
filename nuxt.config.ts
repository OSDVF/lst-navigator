// https://nuxt.com/docs/api/configuration/nuxt-config
import { icons } from './icons.json'

export default defineNuxtConfig({
  devtools: {
    enabled: true,
    timeline: {
      enabled: true
    }
  },
  css: ['~/assets/styles/base.scss'],
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    includeAssets: ['icon.jpg'],
    strategies: 'injectManifest',
    filename: 'sw.ts',
    manifest: {
      name: process.env.APP_NAME,
      short_name: process.env.APP_SHORT_NAME,
      icons
    }
  },
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/png', href: '/android/android-launchericon-96-96.png' },
        //Add web app manifest
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
    },
  },
  vue: {

  }
})
