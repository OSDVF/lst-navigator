import type { PwaInjection } from "@vite-pwa/nuxt";
import type * as Sentry from '@sentry/vue'
import { idb } from '@composi/idb/types'

export { }

// define environment variables here
declare namespace NodeJS {
  interface ProcessEnv {
    readonly VITE_APP_NAME: string;
    readonly VITE_APP_SHORT_NAME: string;
  }
}

declare function definePageMeta(pageMeta: any): void // Supress typescipt warning in VSCode

declare global {
  interface WindowEventMap { "beforeinstallprompt": BeforeInstallPromptEvent; }

  /**
   * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt handler
   * before a user is prompted to "install" a web site to a home screen on mobile.
   *
   * deprecated Only supported on Chrome and Android Webview.
   */
  interface BeforeInstallPromptEvent extends Event {

    /**
     * Returns an array of DOMString items containing the platforms on which the event was dispatched.
     * This is provided for user agents that want to present a choice of versions to the user such as,
     * for example, "web" or "play" which would allow the user to chose between a web version or
     * an Android version.
     */
    readonly platforms: Array<string>;

    /**
     * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
     */
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed',
      platform: string
    }>;

    /**
     * Allows a developer to show the install prompt at a time of their own choosing.
     * This method returns a Promise.
     */
    prompt(): Promise<void>;

  }

  interface Location {
    reload(forcedReload?: boolean): void;
  }
}

declare module '#app' {
  interface NuxtApp {
    $deferredPrompt: () => BeforeInstallPromptEvent | null
    $installPromptSupport: () => boolean,
    $onUpdateCallback: (callback: (reg?: ServiceWorkerRegistration) => void) => void,
    $pwa: PwaInjection,
    $Sentry: typeof Sentry
  }
}

declare module '@composi/idb' {
  export = idb
}