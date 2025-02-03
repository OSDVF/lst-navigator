<template>
    <NuxtPwaAssets />
    <LazyClientOnly>
        <Head>
            <meta name="theme-color" :content="windowIsDark() ? '#000000' : $config.public.themeColor">
        </Head>
    </LazyClientOnly>
    <NuxtLayout :name="$route.name?.toString().includes('install') ? 'install' : undefined">
        <NuxtPage />
    </NuxtLayout>
</template>