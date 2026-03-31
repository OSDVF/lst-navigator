<template>
    <article>
        <template v-if="cloud.user.info?.responseId?.[cloud.selectedEvent]">
            <div
                v-for="field in applications.applications.find(a => a.id == cloud.user.info?.responseId![cloud.selectedEvent])?.questions"
                :key="field.id" :for="field.id.toString()">
                <fieldset v-if="Array.isArray(field.responses)" disabled>
                    <legend>{{ field.title }}</legend>
                    <label v-for="resp in field.responses" :key="`${field.id}${resp}`"><input
                        type="checkbox"
                        checked>&nbsp; {{ resp }}</label>
                </fieldset>
                <label v-else>
                    {{ field.title }}&nbsp;
                    <input type="text" :value="field.responses" readonly>
                </label>
            </div>
        </template>
        <form v-else-if="applications.settings" @submit.prevent="logIn">
            <h1>Ověřte údaje ze své přihlášky</h1>
            <p>
                <small>
                    <Icon name="mdi:information" />&nbsp; Po ověření budete moct zobrazit účastnickou sekci
                </small>
            </p>

            <label v-if="applications.settings.fields.name">
                {{ typeof applications.settings.fields.name == 'number' ? $config.public.applicationDefaultNameField :
                    applications.settings.fields.name }}
                &nbsp;
                <input v-model="name" type="text" name="name" required>
            </label>
            <fieldset class="mt-2">
                <legend>Ověřit pomocí &nbsp;
                    <select v-model="verifyBy">
                        <option value="email">E-mailu</option>
                        <option v-if="applications.settings.fields.phone" value="phone">Telefonního čísla</option>
                    </select>
                </legend>
                <label>
                    {{ verifyBy == 'email' ? "E-mail" : 'Telefonní číslo' }}
                    &nbsp;
                    <input
                        v-model="verify" v-autowidth :type="verifyBy == 'email' ? 'email' : 'text'" required
                        :placeholder="verifyBy == 'email' ? 'Zadejte svůj email z přihlášky' : 'Zadejte své telefonní číslo z přihlášky'">
                </label>
                <br>
                <label v-if="verifyBy != 'email'">
                    E-mail
                    &nbsp;
                    <input
                        v-model="differentEmail" v-autowidth type="email" required
                        placeholder="E-mail, pod kterým se chcete registrovat">
                </label>
            </fieldset>

            <button type="submit" class="large mt-2">
                <Icon name="mdi:arrow-right" class="mb-0.5e" />&nbsp;Ověřit
            </button>
            <br><br>

            <NuxtLink :to="`/login?redirect=${$route.path}`" class="dotted-underline small"><Icon name="mdi:shield-account" /> Místo toho se přihlásit / registrovat jako uživatel</NuxtLink>
        </form>
        <p v-else>
            Nepodařilo se nalézt nastavení účastníckých přihlášek.
        </p>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Účastník',
    name: 'applocation',
})
const name = ref('')
const verifyBy = ref<'email' | 'phone'>('email')
const verify = ref('')
const differentEmail = ref('')

const applications = useApplications()
const cloud = useCloudStore()

async function logIn() {
    const result = await applications.singInParticipant(name.value, verify.value, verifyBy.value == 'email' ? undefined : differentEmail.value, applications)
    if(!result) {
        alert('Nepodařilo se najít přihlášku s těmito údaji')
    }
}

// todo map fields which are bound by id
</script>