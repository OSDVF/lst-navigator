<template>
    <NuxtLayout>
        <NuxtPwaAssets />
        <LazyClientOnly>
            <Head>
                <meta name="theme-color" :content="windowIsDark() ? '#000000' : $config.public.themeColor">
            </Head>
        </LazyClientOnly>
        <NuxtPage />
    </NuxtLayout>
</template>