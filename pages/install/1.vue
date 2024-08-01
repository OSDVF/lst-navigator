<template>
    <article>
        <h1><IconCSS name="carbon:package" />&ensp;Instalace</h1>
        <ClientOnly>
            <p v-if="$deferredPrompt() !== null">
                Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na tlačítko <code>Další</code>
            </p>
            <p v-else-if="$installPromptSupport()">
                Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na takovou tu otravnou spodní lištu.
            </p>
            <p v-else>
                Jsem hybridní webová aplikace, kterou nainstalujete podle toho, jak se to zrovna ve vašem prohlížeči dělá.<br>
                Návody: <a href="https://web.dev/learn/pwa/installation/#ios-and-ipados-installation" target="_blank">iOS</a>,
                <a href="https://web.dev/learn/pwa/installation/#android-installation" target="_blank">Android</a>
                <br><br>
                Nebo někoho zavolejte a on vám pomůže.
            </p>
            <p v-if="$pwa.registrationError">
                <IconCSS name="mdi:alert" /> Nepodařilo se zaregistrovat aplikaci do systému
            </p>
            <p v-if="$pwa.getSWRegistration()">
                <IconCSS name="mdi:check" /> Aplikace zaregistrována
            </p>
            <p v-if="$pwa.swActivated">
                <IconCSS name="mdi:check" /> Aktivováno
            </p>
            <p v-if="$pwa.offlineReady">
                <IconCSS name="mdi:check" /> Stažení
            </p>
        </ClientOnly>
    </article>
</template>
<script setup lang="ts">
const { $deferredPrompt, $installPromptSupport, $pwa } = useNuxtApp()

definePageMeta({
    layout: 'install',
})

const onNextButtonClick = inject<(listener: () => void) => void>('onNextButtonClick')
onNextButtonClick?.(() => $deferredPrompt()?.prompt())

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(asyncComputed(async () => {
    if (import.meta.client && window.matchMedia('(display-mode: standalone)').matches) { return true }
    const p = $deferredPrompt()
    return p !== null && (await p.userChoice).outcome === 'accepted'
}, false))
</script>
