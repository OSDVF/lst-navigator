<template>
    <fieldset class="relative">
        <label>
            <template v-if="cloud.resolvedPermissions.superAdmin">
                <Icon name="mdi:shield-lock-open" title="Úpravy povoleny" tabindex="0" />
                &nbsp;
            </template>
            <template v-else-if="cloud.user.auth?.photoURL">
                <img
                    class="noinvert" referrerPolicy="no-referrer" crossorigin="anonymous"
                    :src="cloud.user.auth.photoURL" alt="Profilový obrázek" width="24" height="24">
                &nbsp;
            </template>
            <span v-if="(!p.register && !p.email) || cloud.user.error" class="inline-block">
                {{ cloud.user.pendingPopup ? 'Postupujte podle pokynů v druhém okně' :
                    cloud.user.auth?.displayName ?? cloud.user.auth?.providerData[0].displayName ?? (prettyError
                        ||
                        'Přihlášení / Registrace') }}
            </span>
            <span v-if="cloud.user.auth?.email" class="muted nowrap ml-1 mr-1">{{
                cloud.user.auth.email }}</span>
            <small v-if="cloud.user.error" class="inline-block">
                <code>{{ cloud.user.error.message.replace('Firebase: ', '') }}</code>
            </small>
        </label>
        <span>
            <LazyClientOnly>
                <template v-if="cloud.user.auth?.uid">
                    <button @click="cloud.user.signOut">
                        <Icon name="mdi:logout" /> Odhlásit
                    </button>
                    &nbsp;
                    <NuxtLink
                        v-if="cloud.user?.auth.providerData[0].providerId === EmailAuthProvider.PROVIDER_ID"
                        :to="'/login?change' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')">
                        <button>
                            <Icon name="mdi:account-key" />
                            Změnit heslo
                        </button>
                    </NuxtLink>
                </template>
                <form v-else-if="p.lost" @submit.prevent="cloud.user.sendPasswordResetEmail(emailInput).then(clear)">
                    <input id="email" v-model="emailInput" required type="email" placeholder="Email"><br>
                    <button type="submit">
                        <Icon name="mdi:email" /> Odeslat email s resetovacím odkazem
                    </button>
                    <br>
                    <NuxtLink
                        :to="'/login?email' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')"
                        class="dotted-underline small">
                        <Icon name="mdi:account-plus" /> Registrovat
                    </NuxtLink>
                </form>
                <form
                    v-else-if="p.register"
                    @submit.prevent="password == confirmPassword ? cloud.user.register(emailInput, password) : alert('Hesla se neshodují')">
                    <input id="email" v-model="emailInput" required type="email" placeholder="Email"><br>
                    <input id="password" v-model="password" required type="password" placeholder="Heslo"><br>
                    <input
                        id="confirmPassword" v-model="confirmPassword" required type="password"
                        placeholder="Potvrzení hesla"><br>
                    <button type="submit">
                        <Icon name="mdi:account-plus" /> Registrovat
                    </button>
                    <br>
                    <NuxtLink
                        :to="'/login?email' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')"
                        class="dotted-underline small">
                        <Icon name="mdi:account-plus" /> Přihlásit
                    </NuxtLink>
                    &ensp;
                    <NuxtLink
                        :to="'/login?lost' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')"
                        class="dotted-underline small">
                        <Icon name="mdi:account-question" /> Zapomenuté heslo
                    </NuxtLink>
                </form>
                <form
                    v-else-if="p.email"
                    @submit.prevent="cloud.user.signIn(false, false, emailInput, password).then((success) => success && clear())">
                    <input id="email" v-model="emailInput" required type="email" placeholder="Email"><br>
                    <input id="password" v-model="password" required type="password" placeholder="Heslo"><br>
                    <button type="submit">
                        <Icon name="mdi:login" /> Přihlásit
                    </button><br>
                    <NuxtLink
                        :to="'/login?register' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')"
                        class="dotted-underline small">
                        <Icon name="mdi:account-plus" /> Registrovat
                    </NuxtLink>
                    &ensp;
                    <NuxtLink
                        :to="'/login?lost' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')"
                        class="dotted-underline small">
                        <Icon name="mdi:account-question" /> Zapomenuté heslo
                    </NuxtLink>
                </form>
                <template v-else>
                    &nbsp;
                    <NuxtLink
                        v-if="!p.email"
                        :to="'/login?email' + ($route.params.redirect ? `&redirect=${$route.params.redirect}` : '')">
                        <button>
                            <Icon name="mdi:login" /> Přihlásit emailem
                        </button>
                    </NuxtLink>
                    &nbsp;
                </template>

                <form
                    v-if="p.change"
                    @submit.prevent="password == confirmPassword ? cloud.user.changePassword(password).then(() => { alert('Heslo změněno'); clear() }) : alert('Hesla se neshodují')">
                    <label for="new">Nové heslo</label>&nbsp;
                    <input id="new" v-model="password" type="password" required><br>
                    <label for="confirm">Potvrzení hesla</label>&nbsp;
                    <input id="confirm" v-model="confirmPassword" type="password" required><br>
                    <button type="submit">
                        <Icon name="mdi:account-key" />
                        Změnit heslo
                    </button>
                </form>
                <span v-if="!cloud.user.auth?.uid">
                    <button
                        @click.exact="cloud.user.signIn()"
                        @click.ctrl="cloud.user.signIn(undefined, undefined, undefined, undefined, true)">
                        <Icon name="mdi:google" /> Použít účet Google
                    </button>
                </span>

                <ProgressBar v-if="cloud.user.pendingAction" class="absolute left-0 bottom-0 right-0" />
            </LazyClientOnly>
        </span>
    </fieldset>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { EmailAuthProvider } from 'firebase/auth'

const cloud = useCloudStore()
const prettyError = ref()
const previousCode = ref()
const p = defineProps<{
    email?: boolean,
    register?: boolean,
    participant?: boolean,
    lost?: boolean,
    change?: boolean,
}>()
const emailInput = ref('')
const password = ref('')
const confirmPassword = ref('')

watch(p, () => {
    emailInput.value = ''
    password.value = ''
    confirmPassword.value = ''
    prettyError.value = ''
})

function alert(message: string) {
    prettyError.value = message
    setTimeout(() => prettyError.value = '', 5000)
}
const router = useRouter()
function clear() {
    emailInput.value = ''
    password.value = ''
    confirmPassword.value = ''
    router.replace('/login')
}

watchEffect(() => {
    if (cloud.user.error?.code) {
        if (cloud.user.error.code === previousCode.value) { return }
        previousCode.value = cloud.user.error.code
    }
    switch (cloud.user.error?.code) {
    case 'auth/popup-blocked':
        alert('Přihlášení bylo zablokováno vaším prohlížečem. Povolte vyskakovací okna (pop-up)')
        setTimeout(() => location.reload(), 7000)
        break
    case 'auth/cancelled-popup-request':
        alert('Pravděpodobně již máte otevřeno jiné přihlašovací okno')
        break
    case 'auth/popup-closed-by-user':
        prettyError.value = 'Přihlašovací okno bylo zavřeno uživatelem'
        break
    case 'auth/email-already-in-use':
        prettyError.value = 'Email je již používán'
        break
    case 'auth/weak-password':
        prettyError.value = 'Heslo je příliš slabé'
        break
    case 'auth/invalid-email':
        prettyError.value = 'Neplatný email'
        break
    case 'auth/user-not-found':
        prettyError.value = 'Uživatel nenalezen'
        break
    case 'auth/wrong-password':
        prettyError.value = 'Špatné heslo'
        break
    case 'auth/too-many-requests':
        prettyError.value = 'Příliš mnoho pokusů o přihlášení. Zkuste to později'
        break
    case 'auth/network-request-failed':
        prettyError.value = 'Chyba sítě'
        break
    case 'auth/operation-not-allowed':
        prettyError.value = 'Přihlášení tímto způsobem není povoleno'
        break
    case 'auth/invalid-credential':
        prettyError.value = 'Neplatné přihlašovací údaje'
        break
    case 'auth/credential-already-in-use':
        prettyError.value = 'Přihlašovací údaje jsou již používány'
        break
    case 'auth/account-exists-with-different-credential':
        prettyError.value = 'Účet již existuje s jinými přihlašovacími údaji'
        break
    case 'auth/user-disabled':
        prettyError.value = 'Uživatel je zablokován'
        break
    case 'auth/user-mismatch':
        prettyError.value = 'Uživatel neodpovídá předchozímu uživateli'
        break
    case 'auth/invalid-verification-code':
        prettyError.value = 'Neplatný ověřovací kód'
        break
    default:
        prettyError.value = cloud.user.error?.message
        break
    }
})

</script>
