<template>
    <article>
        <h2>
            <Icon name="mdi:account-lock" /> Zásady ochrany soukromí
        </h2>
        <p>
            Používáním této aplikace souhlasíte s tím, že <a href="http://semcr.cz" target="_blank">Sdružení evangelické
                mládeže v České republice, z. s.</a>
            <template v-if="$config.public.company"> a 
                <a :href="$config.public.companyLink" target="_blank">{{ $config.public.company }}</a>
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
        Tyto osobní data používáme pouze pro účely organizce této akce ({{ useCloudStore().eventData?.title ?? '' }}), jejích dalších ročníků, a funkčnosti této aplikace. Osobní data nesdílíme s žádnou třetí
        stranou.
        Všechna data uživatele mohou být smazána v této aplikaci na stránce <NuxtLink to="/settings">Nastavení</NuxtLink>
    </article>
</template>