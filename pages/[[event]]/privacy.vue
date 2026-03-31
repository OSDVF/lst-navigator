<template>
    <article>
        <h2>
            <Icon name="mdi:account-lock" /> Zásady ochrany soukromí
        </h2>
        <p>
            Používáním této aplikace souhlasíte s tím, že <a class="dotted-underline" href="http://semcr.cz" target="_blank" rel="noreferrer noopener">Sdružení evangelické
                mládeže v České republice, z. s.</a>
            <template v-if="$config.public.company"> a
                <a :href="$config.public.companyLink" target="_blank" class="dotted-underline" rel="noreferrer noopener">{{ $config.public.company }}</a>
            </template>
            může shromažďovat nebo zpracovávat následující kategorie osobních údajů, když používáte nebo interagujete
            s touto aplikací:
        </p>
        <ul>
            <li>
                Emailová adresa (když se přihlásíte emailovým účtem nebo účtem Google)
            </li>
            <li>Jméno (pokud ho zadáte nebo se přihlásíte k účtu Google)</li>
        </ul>
        Tato osobní data používáme pouze pro účely organizce <template v-if="$route.params.event"> této akce
            ({{ cloud.eventDescription?.title ?? '' }}), jejích dalších ročníků, 
        </template>
        <template v-else>
            našich akcí
        </template>
        a funkčnosti této aplikace. Osobní data nesdílíme s žádnou třetí
        stranou.
        Všechna data uživatele mohou být smazána v této aplikaci na stránce <NuxtLink
            :to="{
                name: 'settings',
                params: {
                    event: $route.params.event || $config.public.defaultEvent
                }
            }">Nastavení</NuxtLink>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    name: 'privacy',
    title: 'Zásady ochrany soukromí',
    layout: 'front-page',
})
const cloud = useCloudStore()
const route = useRoute()
if (route.params.event) {
    setPageLayout('default')
}
</script>