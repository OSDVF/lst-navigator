<template>
    <article>
        <h1>
            <Icon name="mdi:leak" /> Přenos dat
        </h1>
        <template v-if="cloud.eventData?.transfers">
            <p v-if="!(transfer?.status)">
                <button class="large" @click="start">
                    <Icon :name="here ? 'mdi:download' : 'mdi:upload'" /> Zahájit
                </button>
            </p>
            <template v-else-if="transfer.status == TransferStatus.Request">
                <canvas ref="canvas" class="noinvert" />

                <p>Naskenujte kód v zařízení, {{ here ? 'ze' : 'do' }} kterého si přejete načíst uživatelská data.
                    Data {{ here ? 'v tomto' : 'cílovém' }} zařízení jimi budou přepsána.</p>
                <p class="muted">Toto zařízení: <code>{{ settings.userIdentifier }}</code></p>
                <p v-if="error">
                    <code>{{ error }}</code>
                </p>
            </template>

            <p v-else-if="transfer.remote && transfer.status == TransferStatus.Reply" class="large">
                <Icon name="mdi:account-alert" /> Chcete přenést data {{ here ? 'ze' : 'do' }} zařízení <code>{{ transfer.remote
                }}?</code>
                <br>
                <br>
                <button
                    type="button" @click="setDocT(transfersDoc(settings.userIdentifier), {
                        status: TransferStatus.Confirmed,
                    } as Transfer, { merge: true })">
                    <Icon name="mdi:upload" /> Přenést
                </button>
                &ensp;
                <button type="button" @click="start">
                    <Icon name="mdi:close" /> Zrušit
                </button>
            </p>

            <p v-else-if="transfer.remote && transfer.status == TransferStatus.Transfered" class="large">
                <Icon name="mdi:check-circle-outline" /> Přenos proběhl
            </p>

            <p v-if="transfer?.status">
                <button class="large" @click="end">
                    <Icon name="mdi:cancel" /> Ukončit
                </button>
            </p>
        </template>

        <template v-else>
            Přenosy uživatelských dat pro událost <strong>{{ cloud.eventData?.title }}</strong> nejsou povoleny.
        </template>

        <div v-if="cloud.resolvedPermissions.editEvent && here" class="mt-2">
            <h3>
                <Icon name="mdi:shield-lock-open" title="Administrátor události" /> Přenést sem uživatele
            </h3>
            <label for="uid">UID</label>&nbsp;
            <input id="uid" v-model.lazy="adminOtherUIDRaw" type="text" name="uid" placeholder="xasd123"><br>
            <button
                :disabled="!validUID"
                @click="validUID && router.replace('/transfer/admin/' + adminOtherUID)">Přenést</button><br>
            <span v-if="!validUID && adminOtherUID">Toto UID neexistuje, nebo tento uživatel zatím neprovedl žádnou akci</span>
        </div>
    </article>
</template>

<script lang="ts" setup>
import * as Sentry from '@sentry/nuxt'
import { doc, getDoc } from 'firebase/firestore'
import qrcode from 'qrcode'
import { TransferStatus, type Transfer } from '~/types/cloud'
import { setDoc as setDocT } from '~/utils/trace'
import { transfersDoc, useTransfers } from '~/utils/transfers'

const canvas = ref<HTMLCanvasElement>()
const error = ref()

const cloud = useCloudStore()
const router = useRouter()
const settings = useSettings()
const transfers = useTransfers()

const here = computed(() => router.currentRoute.value.params.transfer === 'here')
const transfer = computed(() => transfers.value.find(t => t.id == settings.userIdentifier))

const adminOtherUIDRaw = ref('')
const adminOtherUID = computed(() => adminOtherUIDRaw.value.trim())

const validUID = computedAsync<boolean>(async () => {
    if (!adminOtherUID.value) {
        return false
    }

    if(cloud.feedbackConfig.some(f=>f.title === adminOtherUID.value)) {
        return false //feedback document with the same name will be otherwise found and trigger "valid UID"
    }

    if (Object.hasOwn(cloud.feedback.online, adminOtherUID.value)) {
        return true
    }

    if (cloud.notesCollection && (await getDoc(doc(cloud.notesCollection, adminOtherUID.value))).exists()) {
        return true
    }
    return false
}, false)

async function start() {
    await setDocT(transfersDoc(settings.userIdentifier), {
        status: TransferStatus.Request,
    } as Transfer)
}

async function end() {
    await setDocT(transfersDoc(settings.userIdentifier), {
        status: TransferStatus.None,
    } as Transfer)
}

watch([canvas, router.currentRoute], async ([newCanvas, newTarget]) => {
    if (newCanvas) {
        qrcode.toCanvas(newCanvas, new URL(`/transfer/${newTarget.params.transfer}/${settings.userIdentifier}`, location.origin).toString(), { errorCorrectionLevel: 'H' }, (e) => {
            if (e) {
                console.error(error)
                error.value = e
                Sentry.captureException(error)
            }
        })
    }
})

watch(transfer, async (newTransfer) => {
    if (here.value) {
        // Transfer to this device
        const doc = transfersDoc(settings.userIdentifier)
        if (newTransfer?.remote && newTransfer.status == TransferStatus.Confirmed) {
            settings.setUserIdentifier(newTransfer.remote)
            // TODO wait for the hydration
            await setDocT(doc, {
                status: TransferStatus.Transfered,
            } as Transfer, { merge: true })
        }
        if (newTransfer?.status == TransferStatus.Transfered) {
            setTimeout(async () => {
                router.replace('/settings')
                await setDocT(doc, {
                    status: TransferStatus.None,
                })
            }, 1500)
        }
    }
}, { immediate: true })
</script>