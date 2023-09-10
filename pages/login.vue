<template>
    <article>
        <h1>Přihlaste se</h1>
        <p>Pomocí účtu Google</p>
        <LoginField />
    </article>
</template>

<script setup lang="ts">
import { User } from 'firebase/auth'

const user = useCurrentUser()
const router = useRouter()
function tryRedirect(newUser?: User | null) {
    const redir = router.currentRoute.value.query.redirect
    if (newUser && redir) {
        router.push(redir as string)
    }
}
watch(user, tryRedirect)
onMounted(() => tryRedirect(user.value))
</script>
