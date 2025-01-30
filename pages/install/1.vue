<template>
    <article>
        <h1>
            <Icon name="carbon:package" />&ensp;Instalace
        </h1>
        <LazyClientOnly>
            <p v-if="$pwa?.registrationError">
                <Icon name="mdi:alert" /> Chyba při registraci aplikace do systému
                <br>
                <br>
                Aplikace bude fungovat pouze online.
            </p>
            <template v-else>
                <p v-if="$deferredPrompt?.value">
                    Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na tlačítko <code>Instalovat</code>
                </p>
                <p v-else-if="$installPromptSupport()">
                    Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na vyskakovací spodní lištu/okno.
                </p>
                <p v-else>
                    Jsem hybridní webová aplikace, kterou nainstalujete podle toho, jak se to zrovna ve vašem prohlížeči
                    dělá.<br>
                    Návody: <a
                        href="https://web.dev/static/learn/pwa/installation/video/RK2djpBgopg9kzCyJbUSjhEGmnw1/UhWxRAtIB6KQpbMYnDSe.mp4"
                        target="_blank" class="dotted-underline">iOS</a>,
                    <a
                        href="https://web.dev/static/learn/pwa/installation/image/chrome-edge-menu-items-27db25e4de818_960.png" target="_blank"
                        class="dotted-underline">Android</a>
                    <br><br>
                    <template v-if="browser?.os == 'iOS'">
                        <strong v-if="browser.name !== 'ios'">
                            <Icon name="mdi:compass-outline" /> Na iOS je třeba použít prohlížeč Safari
                        </strong>
                        <template v-else>
                            1. Kliknetě na tlačítlo sdílení
                            <Icon name="mdi:logout-variant" style="rotate: -90deg;" /> v liště
                            <br>
                            2. <Icon name="mdi:plus-box-outline" /> Přidat na plochu
                            <img src="/install.png" width="100%" alt="Instalace aplikace" style="max-width: 500px; border-radius: 2px;margin-top: .5rem;">
                        </template>
                        <br>
                    </template>
                </p>
            </template>
            <p v-if="$pwa?.getSWRegistration()">
                <Icon name="mdi:check" /> Aplikace zaregistrována
            </p>
            <p v-if="$pwa?.swActivated">
                <Icon name="mdi:check" /> Aktivováno
            </p>
            <p v-if="$pwa?.offlineReady">
                <Icon name="mdi:check" /> Stažení
            </p>
            Případné chyby hlaste na <LazyClientOnly>
                <a class="dotted-underline" :href="`mailto:${$config.public.supportEmail}`">{{
                    $config.public.supportEmail }}</a>
            </LazyClientOnly>
        </LazyClientOnly>
    </article>
</template>
<script setup lang="ts">
import { detect } from 'detect-browser'
const { $deferredPrompt, $installPromptSupport, $pwa } = useNuxtApp()
const browser = detect()

definePageMeta({
    layout: 'install',
})
if (import.meta.browser) {
    const nextText = inject<Ref<string>>('nextText')
    if (nextText && $deferredPrompt.value) {
        nextText.value = 'Instalovat'
    }
}

const onNextButtonClick = inject<(listener: () => void) => void>('onNextButtonClick')
onNextButtonClick?.(() => $deferredPrompt.value?.prompt())

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')// TODO use only properties of $pwa?
skipToNextIf?.(asyncComputed(async () => {
    if (!('ServiceWorker' in window)) { return true }// skip because no support
    if (import.meta.client && window.matchMedia('(display-mode: standalone)').matches) { return true }// skip because already installed
    const p = $deferredPrompt.value
    // Prompt automatically
    if (p) {
        await p.prompt()
        return (await p.userChoice).outcome === 'accepted'
    }
}, false))
</script>
