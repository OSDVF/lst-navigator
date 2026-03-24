<template>
    <article>
        <template v-if="cloud.user.info?.responseId">
            <div
                v-for="field in applications.applications.find(a => a.id == cloud.user.info?.responseId[cloud.selectedEvent])?.questions"
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
            <label v-if="applications.settings.fields.name">
                {{ applications.settings.fields.name }}
                &nbsp;
                <input v-model="name" type="text" name="name">
            </label>
            <fieldset>
                <legend>Ověřit pomocí &nbsp;
                    <select v-model="verifyBy">
                        <option value="email">E-mailu</option>
                        <option v-if="applications.settings.fields.phone" value="phone">Telefonního čísla</option>
                    </select>
                </legend>
                <label>
                    {{ verifyBy == 'email' ? "E-mail" : 'Telefonní číslo' }}
                    &nbsp;
                    <input v-model="verify" type="text">
                </label>
            </fieldset>
        </form>
        <p v-else>
            Nepodařilo se nalézt nastavení účastníckých přihlášek.
        </p>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Moje přihláška',
    middleware: 'auth',
    name: 'applocation',
})
const name = ref('')
const verifyBy = ref('email')
const verify = ref('')

const applications = useApplications()
const cloud = useCloudStore()

function logIn() {
    alert('Funkce zatím není dodělána')
}

// todo map fields which are bound by id
</script>