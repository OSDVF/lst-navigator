<template>
    <div>
        <main>
            <slot />
        </main>
        <aside class="navigation">
            <NuxtLink to="/info">
                <IconCSS name="mdi:information" size="2rem" />
                {{ config.public.title }}
            </NuxtLink>
            <NuxtLink to="/info">
                <IconCSS name="mdi:calendar-text" size="2rem"/>
                Program
            </NuxtLink>
            <NuxtLink to="/info">
                <IconCSS name="mdi:cog" size="2rem"/>
                Nastavení
            </NuxtLink>
        </aside>
    </div>
</template>

<script setup lang="ts">

const config = useRuntimeConfig();
</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

aside.navigation {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    border-top: 1px solid rgba($link-background, 0.1);

    &>a {
        flex-basis: 33%;
        padding: .5rem;
        text-align: center;

        &>span {
            display: block;
            margin: auto;
        }
    }
}
</style>