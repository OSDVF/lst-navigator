<template>
    <div class="p-2">
        <ProgressBar v-if="usersPending" />
        <div v-show="someSelection">
            <button @click="changePermissionsVisible = true">
                Změnit oprávnění
            </button>
            <form v-show="changePermissionsVisible" @submit.prevent="changePermissions(); changePermissionsVisible = false">
                <select v-model="targetPermission" required>
                    <option v-for="(name, type) in permissionNames" :key="type" :value="type">
                        {{ name }}
                    </option>
                </select>
                <input type="submit" value="Potvrdit">
            </form>
        </div>
        <ClientOnly>
            <Component
                :is="DataTable" ref="table" :data="usersIndexed" :options="{
                    order: [[1, 'asc']],
                    select: true
                }" :columns="[
                    {
                        searchable: false,
                        orderable: false,
                        render: (data: string) => data ? `<img class='noinvert' width='24px' referrerPolicy='no-referrer' crossorigin='anonymous' src='${data}' />` : null
                    },
                    null,
                    null,
                    null,
                    null,
                    null,
                    {
                        render: (data: keyof typeof permissionNames) => data ? `<span title='${permissionNames[data]}' class='icon' style='mask-image: url(https://api.iconify.design/mdi/${({
                            super: 'shield-lock-open', event: 'calendar-check', admin: 'account-lock-open', null: null
                        })[data]}.svg);'></span>` : ''
                    }
                ]" @select="selectionChanged" @deselect="selectionChanged" @error="dtError"
            >
                <thead>
                    <tr>
                        <th />
                        <th>ID</th>
                        <th>Účet</th>
                        <th>Podpis</th>
                        <th>Posední přihlášení</th>
                        <th>Poslední feedback</th>
                        <th>Oprávnění</th>
                    </tr>
                </thead>
            </Component>
        </ClientOnly>
        <p v-if="dtErrors" class="flex align-items-start">
            <button @click="dtErrors = ''">
                x
            </button>
            <pre class="m-0">{{ dtErrors }}</pre>
        </p>
    </div>
</template>

<script setup lang="ts">
import type { Api } from 'datatables.net'
import { doc, setDoc } from 'firebase/firestore'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { UpdatePayload, UserInfo } from '@/types/cloud'

definePageMeta({
    title: 'Uživatelé',
    middleware: ['auth'],
    layout: 'admin'
})

const cloudStore = useCloudStore()
const app = useNuxtApp()
const permissionError = ref()
const firestore = useFirestore()
const users = useAsyncData('usersCollection', () => useCollection<UserInfo>(knownCollection(firestore, 'users'), { maxRefDepth: 0, wait: true, onError(e: any) { permissionError.value = e } }).promise.value, {
    server: false,
    lazy: true
})
const usersPending = users.pending
const permissionNames = computed(() => ({
    ...(cloudStore.resolvedPermissions.superAdmin ? { super: 'SuperAdmin' } : {}), // super admin can make others super admins
    ...(cloudStore.resolvedPermissions.eventAdmin ? { admin: 'Správce' } : {}),
    event: 'Správce události',
    null: 'Nic'
}))
const dtErrors = ref('')

const usersIndexed = computed(() => {
    const result = []
    if (users.data.value) {
        for (const user of users.data.value) {
            const effectiveSignature = user.signature[cloudStore.selectedEvent] || user.signatureId[cloudStore.selectedEvent]
            const values: [string | undefined, string, string, string, string, string, string | boolean | null] = [
                user.photoURL,
                user.id,
                user.name ?? '',
                effectiveSignature,
                new Date(user.lastLogin).toLocaleString(),
                cloudStore.feedback.online?.[effectiveSignature] ?? 'Nikdy',
                user.permissions?.superAdmin === true ? 'super' : user.permissions?.[cloudStore.selectedEvent]
            ]
            result.push(values)
        }
    }
    return result
})

const table = ref<{ dt: Api<typeof usersIndexed.value> }>()
const changePermissionsVisible = ref(false)
const targetPermission = ref<UserInfo['permissions'][0] | 'super'>()
const someSelection = ref(false)
function selectionChanged() {
    if (table.value) {
        someSelection.value = table.value.dt.rows({ selected: true }).data().length > 0
    }
}

function dtError(e: any, settings: any, techNote: string, message: string) {
    console.error(e, settings, techNote, message)
    app.$Sentry.captureException(message, {
        extra: {
            e,
            techNote,
            message
        }
    })
    dtErrors.value += '\n' + message
}

function changePermissions() {
    const selectedRows = table.value?.dt.rows({ selected: true }).data()
    if (selectedRows?.length) {
        selectedRows.each((selectedRow) => {
            const uid = selectedRow[1]
            const userDoc = doc(knownCollection(firestore, 'users'), uid)
            setDoc(userDoc, {
                permissions: targetPermission.value === 'super'
                    ? {
                        superAdmin: true
                    }
                    : {
                        [cloudStore.selectedEvent]: targetPermission.value,
                        superAdmin: false
                    }
            } as Partial<UpdatePayload<UserInfo>>, {
                merge: true
            })
        })
    }
}
const DataTable = shallowRef()
onMounted(() => {
    const dtModule = import('datatables.net-vue3')
    const selectModule = import('datatables.net-select')
    const responsiveModule = import('datatables.net-responsive')
    dtModule.then(async (module) => {
        const $ = await import('jquery')
        const Select = await selectModule
        const Responsive = await responsiveModule
        DataTable.value = module.default
        DataTable.value.use(Select.default)
        DataTable.value.use(Responsive.default)
        $.fn.dataTable.ext.errMode = 'none'
    })
})
</script>

<style lang="scss">
@import 'datatables.net-dt';
@import 'datatables.net-select-dt';
@import 'datatables.net-responsive-dt';

.datatable {
    .icon {
        background: black;
        display: inline-block;
        width: 1.5rem;
        height: 1.5rem;
        mask-repeat: no-repeat;
        mask-size: 100% 100%;
        ;
    }
}
</style>
