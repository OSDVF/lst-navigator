<template>
    <article class="login">
        <h1>{{ typeof $route.query.register !== 'undefined' ? 'Registrujte se' : user?.uid ? 'Přihlášeno' :
            'Přihlaste se' }}</h1>
        <LazyLoginField
            class="large" :email="!user && typeof $route.query.email !== 'undefined'"
            :register="!user && typeof $route.query.register !== 'undefined'"
            :change="!!user && typeof $route.query.change !== 'undefined'"
            :lost="!user && typeof $route.query.lost !== 'undefined'" />
    </article>
</template>

<script setup lang="ts">
import type { User } from 'firebase/auth'
import { useCurrentUser } from 'vuefire'

const user = import.meta.browser ? useCurrentUser() : ref()
const router = useRouter()
function tryRedirect(newUser?: User | null) {
    const redir = router.currentRoute.value.query.redirect
    if (newUser && redir) {
        router.push(redir as string)
    }
}
watch(user, tryRedirect, { immediate: true })

</script>

<style lang="scss">
.login fieldset {
    border: 0;

    * {
        vertical-align: middle;
    }
}

.large {
    input {
        font-size: 1rem;
    }

    button {
        font-size: 1rem;
    }

    small {
        margin: .4rem 0;
    }
}
</style>
