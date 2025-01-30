<template>
    <NuxtLayout>
        <NuxtPwaAssets />
        <Head>
            <meta name="theme-color" :content="windowIsDark() ? '#000000' : $config.public.themeColor" >
        </Head>
        <NuxtPage />
    </NuxtLayout>
</template>