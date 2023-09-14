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
        <LazyDataTable
            ref="table" :data="usersIndexed" :options="{
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
                        [UserLevel.SuperAdmin]: 'shield-lock-open', [UserLevel.ScheduleAdmin]: 'calendar-check', [UserLevel.Admin]: 'account-lock-open', [UserLevel.Nothing]: null
                    })[data]}.svg);'></span>` : ''
                }
            ]" @select="selectionChanged" @deselect="selectionChanged"
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
        </LazyDataTable>
    </div>
</template>

<script setup lang="ts">
import type { Api } from 'datatables.net'
import { doc, setDoc } from 'firebase/firestore'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { UpdatePayload, UserInfo, UserLevel } from '@/types/cloud'

definePageMeta({
    title: 'Uživatelé',
    middleware: ['auth'],
    layout: 'admin'
})

const cloudStore = useCloudStore()
const permissionError = ref()
const firestore = useFirestore()
const users = useAsyncData('usersCollection', () => useCollection<UserInfo>(knownCollection(firestore, 'users'), { maxRefDepth: 0, wait: true, once: !!process.server, onError(e: any) { permissionError.value = e } }).promise.value, {
    server: false,
    lazy: true
})
const usersPending = users.pending
const permissionNames = computed(() => ({
    ...(cloudStore.resolvedPermissions.superAdmin ? { [UserLevel.SuperAdmin]: 'SuperAdmin' } : {}), // super admin can make others super admins
    ...(cloudStore.resolvedPermissions.eventAdmin ? { [UserLevel.Admin]: 'Správce' } : {}),
    [UserLevel.ScheduleAdmin]: 'Správce události',
    [UserLevel.Nothing]: 'Nic'
}))

const usersIndexed = computed(() => {
    const result = []
    if (users.data.value) {
        for (const user of users.data.value) {
            const effectiveSignature = user.signature[cloudStore.selectedEvent] || user.signatureId[cloudStore.selectedEvent]
            const values: [string | undefined, string, string, string, string, string, UserLevel | boolean] = [
                user.photoURL,
                user.id,
                user.name ?? '',
                effectiveSignature,
                new Date(user.lastLogin).toLocaleString(),
                cloudStore.feedback.online?.[effectiveSignature] ?? 'Nikdy',
                user.permissions?.superAdmin === true ? UserLevel.SuperAdmin : user.permissions?.[cloudStore.selectedEvent]
            ]
            result.push(values)
        }
    }
    return result
})

const table = ref<{ dt: Api<typeof usersIndexed.value> }>()
const changePermissionsVisible = ref(false)
const targetPermission = ref<UserInfo['permissions'][0]>()
const someSelection = ref(false)
function selectionChanged() {
    if (table.value) {
        someSelection.value = table.value.dt.rows({ selected: true }).data().length > 0
    }
}


function changePermissions() {
    const selectedRows = table.value?.dt.rows({ selected: true }).data()
    if (selectedRows?.length) {
        selectedRows.each((selectedRow) => {
            const uid = selectedRow[1]
            const userDoc = doc(knownCollection(firestore, 'users'), uid)
            setDoc(userDoc, {
                permissions: targetPermission.value === UserLevel.SuperAdmin
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
</script>
