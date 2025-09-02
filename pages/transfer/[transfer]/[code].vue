<template>
    <article>
        <h1>
            <Icon name="mdi:leak" /> Přenést data
        </h1>
        <template v-if="cloud.eventData?.transfers">

            <template v-if="transferStatus == TransferStatus.Request">
                <p>Přejete si zkopírovat uživatelská data {{ toOther ? 'do' : 'ze' }} zařízení
                    <code>{{ target }}</code>?
                </p>
                <p v-if="targetNick">Podpis uživatele: <em>{{ targetNick }}</em></p>
                <p><button type="button" class="large" @click="transfer">
                    <Icon :name="toOther ? 'mdi:upload' : 'mdi:download'" /> Ano
                </button></p>
            </template>
            <p v-else-if="transferStatus == TransferStatus.Reply">
                <Icon name="mdi:account-alert" /> Potvrďte přenos na druhém zařízení
                <br>
                <ProgressBar />
            </p>
            <p v-else-if="transferStatus == TransferStatus.Confirmed">
                Probíhá přenos...
                <br>
                <ProgressBar />
            </p>
            <p v-else-if="transferStatus == TransferStatus.Transfered" class="large">
                <Icon name="mdi:check-circle-outline" /> Přenos proběhl
            </p>
            <p v-else-if="cloud.resolvedPermissions.editEvent">
                <Icon name="mdi:shield-lock-open" title="Administrátor události" /> Vynucený přenos uživatele
                <br>

                Uživatel {{ targetNick ?? '(bez podpisu)' }} (UID {{ target }})
                <br><br>
                <button @click="settings.setUserIdentifier(target); router.replace('/settings')">
                    <Icon name="mdi:download-lock" /> Přenést sem
                </button>
            </p>
            <p v-else>
                <Icon name="mdi:leak-off" /> Zkuste zahájit přenos na druhém zaříení znovu.
            </p>
        </template>
        <template v-else>
            Přenosy uživatelských dat pro událost <strong>{{ cloud.eventData?.title }}</strong> nejsou povoleny.
        </template>
        <p>
            <NuxtLink to="/settings" replace>Zpět</NuxtLink>
        </p>
    </article>
</template>

<script setup lang="ts">
import { TransferStatus, type Transfer } from '~/types/cloud'
import { setDoc as setDocT } from '~/utils/trace'
import { transfersDoc, useTransfers } from '~/utils/transfers'

const cloud = useCloudStore()
const router = useRouter()
const settings = useSettings()
const transfers = useTransfers()

const toOther = computed(() => router.currentRoute.value.params.transfer === 'here')
const target = computed(() => router.currentRoute.value.params.code as string)
const targetNick = computed(() => cloud.feedback.online[target.value].nickname)
const transferStatus = computed(() => transfers.value.find(t => t.id == target.value)?.status)

async function transfer() {
    if (toOther.value) {
        // To other device - create a success reply
        await setDocT(transfersDoc(target.value), {
            remote: settings.userIdentifier,
            status: TransferStatus.Reply,
        } as Transfer)
    } else {
        // To this device - load directly
        settings.setUserIdentifier(target.value)
        // TODO wait for the feedback to be hydrated into offline
        setTimeout(() => setDocT(transfersDoc(target.value), {
            status: TransferStatus.Transfered,
        } as Transfer), 1000)
    }
}

watch(transferStatus, async (newStatus) => {
    if (newStatus == TransferStatus.Transfered) {
        router.replace('/settings')
        await setDoc(transfersDoc(target.value), {
            status: TransferStatus.None,
        })
        alert('Přenos dokončen')
    }
})
</script>