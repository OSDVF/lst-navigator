<template>
    <NuxtErrorBoundary @error="captureError">

        <Head>
            <Title>Chyba · {{ config.public.title }}</Title>
        </Head>
        <template #error="{ error, clearError }">
            <main>
                <article>
                    <h1>Chyba při zobrazování chyby</h1>
                    <p>
                        <code class="error">{{ error }}</code>
                    </p>
                    <button @click="clearError">
                        Zkusit znovu
                    </button>
                    <p>
                        Pokud chyba přetrvává, zkuste
                        <AppManageBtns />
                    </p>
                </article>
            </main>

        </template>
        <main class="flex-center flex-col">
            <div>
                <h1 class="text-4xl">Hodně jseš někde</h1>
                <div class="p">
                    Chyba <code>{{ props.error.name }}<input
                        v-model="code" v-autowidth type="text"
                        class="editable error"></code>
                    <button class="" @click="handleError">
                        <Icon name="mdi:emoticon" /> Ignorovat
                    </button>
                    <div v-if="props.error" class="p">
                        <code v-if="'message' in props.error">
                            {{ props.error.message }}
                            <br>
                            <!-- eslint-disable vue/no-v-html -->
                        </code>
                        <div
                            v-if="'stack' in props.error" style="overflow: auto;" class="mw-100"
                            v-html="props.error.stack" />
                        <template v-else>
                            {{ props.error.toJSON() }}
                        </template>
                    </div>
                </div>
                <p>
                    <NuxtLink to="/">
                        <button class="large" type="button">
                            <Icon name="mdi:home" /> Vrátit se do aplikace {{ config.public.longName }}
                        </button>
                    </NuxtLink>
                </p>
                <img
                    class="round-1 mw-full noinvert" :src="`https://http.cat/${code}`" :alt="code.toString()"
                    :title="`Chyba ${code}`">
                <br>
            </div>
        </main>
    </NuxtErrorBoundary>
</template>

<script lang="ts" setup>
import type { H3Error } from 'h3'

const app = useNuxtApp()
const config = useRuntimeConfig()
const props = defineProps<{
    error: H3Error,
}>()

const handleError = () => clearError()

function captureError(error: unknown) {
    try {
        console.error(error, error instanceof TypeError ? error.stack : null)
        app.$Sentry.captureException(error)
    } catch (e) { console.error(e) }
}

const code = ref(props.error.statusCode)

if (import.meta.browser) {
    const comChannel = new BroadcastChannel('SWCom')
    comChannel.addEventListener('message', (ev) => {
        if (typeof ev.data === 'number') {
            code.value = ev.data
            app.$Sentry.captureMessage(`HTTP ${ev.data}`, 'warning')
        }
    })
}
</script>