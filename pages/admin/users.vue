<template>
    <div class="p-2">
        <LazyDataTable
            ref="table" :data="usersIndexed" :options="{
                order: [[1, 'asc']],
                select: true,
                responsive: true
            }" :columns="[
                {
                    searchable: false,
                    orderable: false,
                    render: (data: string) => data ? `<img class='noinvert' width='24px' referrerPolicy='no-referrer' src='${data}' />` : null
                },
                {
                    render: (data: [string, string]) => `<span tabindex='0' title='${data[1]}'>${data[0]}</span>`
                },
                null,
                null,
                null,
                null,
                {
                    render: (data: UserLevel) => data ? `<span tabindex='0' title='${cloudStore.permissionNames[data]}' class='icon' style='--icon: url(https://api.iconify.design/mdi/${(userLevelToIcon)[data]}.svg);'></span>` : ''
                }
            ]" @select="selectionChanged" @deselect="selectionChanged">
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
        <ProgressBar v-if="usersPending" />
        <template v-if="cloudStore.resolvedPermissions.editEvent">
            <div v-show="someSelection">
                Akce:&ensp;
                <button @click="changePermissionsVisible = true">
                    <Icon name="mdi:shield-edit" /> Změnit oprávnění
                </button>
                <form
                    v-show="changePermissionsVisible"
                    @submit.prevent="changePermissions(); changePermissionsVisible = false">
                    <select v-model="targetPermission" required>
                        <option v-for="(name, type) in cloudStore.permissionNames" :key="type" :value="type">
                            {{ name }}
                        </option>
                    </select>
                    <input type="submit" value="Potvrdit">
                </form>
            </div>
            <div v-show="!someSelection">
                Pro editaci uživatelských oprávnění nejdříve vyberte uživatele. Oprávnění se nastavují <strong>pro
                    každou akci separátně</strong>.
            </div>
        </template>
        <template v-else>
            Nemáte oprávnění na úpravu uživatelských oprávnění u této události.
        </template>
    </div>
</template>

<script setup lang="ts">
import { doc } from 'firebase/firestore'
import { setDoc, useCollection as useCollectionT } from '~/utils/trace'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { type UpdatePayload, type UserInfo, UserLevel, userLevelToIcon } from '@/types/cloud'
import type { Api } from '@/types/datatables'

definePageMeta({
    title: 'Uživatelé',
    middleware: ['auth'],
    layout: 'admin',
})

const permissionError = ref()
const cloudStore = useCloudStore()
const firestore = cloudStore.probe && useFirestore()
const users = useCollectionT<UserInfo>(firestore ? knownCollection(firestore, 'users') : null,
    {
        maxRefDepth: 0,
        wait: true,
        once: !!import.meta.server,
        onError(e: any) { permissionError.value = e },
    })
const usersPending = users.pending

const usersIndexed = computed(() => {
    const result = []
    if (users.data.value) {
        for (const user of users.data.value as (UserInfo & { id: string })[]) { // firestore documents have an added property 'id'
            const effectiveSignature = user.signature?.[cloudStore.selectedEvent] || user.signatureId?.[cloudStore.selectedEvent] || ''
            const values: [string, [string, string], string, string, string, string, UserLevel | boolean, string] = [
                user.photoURL ?? '',
                [user.email ?? user.id, user.id],
                user.name ?? '',
                effectiveSignature,
                new Date(user.lastLogin).toLocaleString(),
                cloudStore.feedback.online?.[effectiveSignature]?.toString() ?? 'Nikdy',
                user.permissions?.superAdmin === true ? UserLevel.SuperAdmin : user.permissions?.[cloudStore.selectedEvent] ?? UserLevel.Nothing,
                user.id,
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
        const selected = table.value.dt.rows({ selected: true }).data().length > 0
        if (cloudStore.resolvedPermissions.editEvent) {
            someSelection.value = selected
        } else if (selected) {
            table.value.dt.rows().deselect()
            someSelection.value = false
        }
    }
}


function changePermissions() {
    const selectedRows = table.value?.dt.rows({ selected: true }).data()
    if (selectedRows?.length && firestore) {
        selectedRows.each(async (selectedRow) => {
            const uid = selectedRow[7]
            const userDoc = doc(knownCollection(firestore, 'users'), uid)
            await setDoc(userDoc, {
                permissions: targetPermission.value === UserLevel.SuperAdmin
                    ? {
                        superAdmin: true,
                    }
                    : {
                        [cloudStore.selectedEvent]: parseInt(targetPermission.value?.toString() ?? '0'),
                        superAdmin: false,
                    },
            } as Partial<UpdatePayload<UserInfo>>, {
                merge: true,
            })
        })
    }
}
</script>
