<template>
    <NuxtPwaAssets />
    <LazyClientOnly>

        <Head>
            <meta name="theme-color" :content="useColorMode().state.value == 'dark' ? '#000000' : $config.public.themeColor">
        </Head>
    </LazyClientOnly>
    <NuxtLayout :key="$route.path" :class="settings.blur.value ? 'transp' : ''" fallback="default">
        <NuxtPage />
    </NuxtLayout>
    <LazyClientOnly>
        <LazyHydratedCheck />
    </LazyClientOnly>
</template>

<script setup lang="ts">
const settings = useSettings()
</script>