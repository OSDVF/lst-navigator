<template>
    <article>
        <h1><IconCSS name="carbon:package" />&ensp;Instalace</h1>
        <p v-if="$deferredPrompt !== null">
            Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na tlačítko <code>Další</code>
        </p>
        <p v-else-if="!$installPromptSupport()">
            Jsem hybridní webová aplikace, kterou nainstalujete kliknutím na takovou tu otravnou spodní lištu.
        </p>
        <p>
            Jsem hybridní webová aplikace, kterou nainstalujete podle toho, jak se to zrovan ve vašem prohlížeči dělá.<br>
            Návody: <a href="https://web.dev/learn/pwa/installation/#ios-and-ipados-installation" target="_blank">iOS</a>,
            <a href="https://web.dev/learn/pwa/installation/#android-installation" target="_blank">Android</a>
            <br><br>
            Nebo někoho zavolejte a on vám pomůže.
        </p>
    </article>
</template>
<script setup lang="ts">
const { $deferredPrompt, $installPromptSupport } = useNuxtApp()

definePageMeta({
    layout: 'install'
})

const onNextButtonClick = inject<(listener: Function) => void>('onNextButtonClick')
onNextButtonClick?.(() => $deferredPrompt()?.prompt())

const skipToNextIf = inject<(ref: Ref) => void>('skipToNextIf')
skipToNextIf?.(asyncComputed(async () => {
    if (window.matchMedia('(display-mode: standalone)').matches) { return true }
    const p = $deferredPrompt()
    return p !== null && (await p.userChoice).outcome === 'accepted'
}, false))
</script>
