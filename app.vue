<template>
    <NuxtPwaAssets />
    <LazyClientOnly>

        <Head>
            <meta name="theme-color" :content="windowIsDark() ? '#000000' : $config.public.themeColor">
        </Head>
    </LazyClientOnly>
    <NuxtLayout :key="$route.path" fallback="default">
        <NuxtPage />
    </NuxtLayout>
    <LazyClientOnly>
        <LazyHydratedCheck />
    </LazyClientOnly>
</template>