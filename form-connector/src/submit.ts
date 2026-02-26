import { collection, doc, getDoc, setDoc } from 'firebase/firestore'
import { useFirestore } from './firebase'
import { getEventSettings, type EventSettings } from './settings'

type ResponseRecord = {
    email: string,
    edits: number,
    edit: string,
}

type EmailTemplateVars = {
    editLink: string,
    responseId: string,
    canEdit: boolean,
    qrCode: string | boolean,
    message?: string,
    price: number,
} & Partial<Omit<EventSettings, 'priceExpression' | 'emailBody' | 'emailHeadNew' | 'emailHeadEdited' | 'messageTemplate'>>

export async function onSubmitForm(e: GoogleAppsScript.Events.FormsOnFormSubmit) {
    const response = e.response
    const form = e.source
    const canEdit = form.canEditResponse()
    const settings = await getEventSettings()

    const itemResponses = response.getItemResponses()
    // Put together the email body by appending all the
    // questions & responses to the emailContent variable.
    const table = HtmlService.createHtmlOutput('<p><table border=\'1\' cellspacing=\'0\'>')
    const respondentAddress = response.getRespondentEmail()
    table.append('<tr><td>#</td><th>Otázka</th><td>Odpověď</td></tr>')

    if (respondentAddress) {
        addQuestionToTable(table, -1, respondentAddress, 'Email')
    }

    for (let i = 0; i < itemResponses.length; i++) {
        const itemResponse = itemResponses[i]!
        const response = itemResponse.getResponse()
        const item = itemResponse.getItem()
        const question = item.getTitle()

        if (response !== '' && !(Array.isArray(response) && response.length == 0)) {
            addQuestionToTable(table, i, response, question)
        }
    }
    table.append('</table></p>')


    const templateVars: EmailTemplateVars = {
        accountNumber: settings.accountNumber,
        adminEmail: settings.adminEmail,
        bankCode: settings.bankCode,
        currency: settings.currency,
        eventName: settings.eventName,
        extras: settings.extras,
        mainOrg: settings.mainOrg,
        priceCategories: settings.priceCategories,

        editLink: response.getEditResponseUrl(),
        message: settings.messageTemplate?.evaluate().getContent(),
        responseId: response.getId(),
        canEdit: canEdit,
        qrCode: false,
        price: 0,
    }
    {
        templateVars.price = eval(`(function(){Object.assign(this,${JSON.stringify(templateVars)});return ${settings.priceExpression}})()`)
    }

    const inlineImages: Record<string, GoogleAppsScript.Base.Blob> = {}
    if (templateVars.price) {
        try {
            const qrRequest = UrlFetchApp.fetch(`https://api.paylibo.com/paylibo/generator/czech/image?compress=false&size=400&accountNumber=${settings.accountNumber}&bankCode=${settings.bankCode}&amount=${templateVars.price}&currency=${settings.currency}&message=${encodeURIComponent(templateVars.message ?? '')}`)
            const code = qrRequest.getResponseCode()
            if (code == 200) {
                const qrBlob = qrRequest.getBlob()
                const imageId = `qrCode${Date.now().toString(36).substring(3)}`
                qrBlob.setName(imageId)
                inlineImages[imageId] = qrBlob
                templateVars.qrCode = imageId
            } else {
                console.warn('QR code generate response: ', code, qrRequest.getContentText(), qrRequest.getHeaders())
            }
        } catch (e) {
            console.error(e)
        }
    }

    let headContent = ''

    if (settings.emailBody) {
        Object.assign(settings.emailBody, templateVars)
    }
    if (settings.emailHeadEdited) {
        Object.assign(settings.emailHeadEdited, templateVars)
    }
    if (settings.emailHeadNew) {
        Object.assign(settings.emailHeadNew, templateVars)
    }

    let edited = false
    try {
        const fs = useFirestore()

        if (settings.responsesCollection) {
            const d = doc(collection(fs, settings.responsesCollection), templateVars.responseId)
            let responseRecord = (await getDoc(d)).data() as ResponseRecord | undefined
            if (responseRecord && !settings.treatAllAsNew) {
                responseRecord.edits = responseRecord.edits + 1
                responseRecord.email = responseRecord.email ?? respondentAddress
                const head = settings.emailHeadEdited ?? settings.emailHeadNew
                if (head) {
                    headContent = head.evaluate().getContent()
                }
                edited = true
            } else {
                responseRecord = { email: respondentAddress, edits: 0, edit: templateVars.editLink }
                if (settings.emailHeadNew) {
                    headContent = settings.emailHeadNew.evaluate().getContent()
                }
            }

            setDoc(d, responseRecord, { merge: true })
        }

    } catch (e) {
        console.warn(e)
    }
    if (!headContent && settings.emailHeadNew) {
        headContent = settings.emailHeadNew.evaluate().getContent()
    }

    const emailContent = headContent + table.getContent() + (settings.emailBody ? settings.emailBody.evaluate().getContent() : '')

    if (settings.adminEmail) {
        MailApp.sendEmail({
            to: settings.adminEmail,
            subject: edited ? `Úprava přihlášky ${respondentAddress}` : `Přihláška na ${settings.eventName} - ${respondentAddress}`,
            htmlBody: emailContent,
            inlineImages,
        })
    }

    if (respondentAddress) {
        MailApp.sendEmail({
            to: respondentAddress,
            subject: edited ? `${settings.eventName} - Úprava přihlášky` : `Přihláška na ${settings.eventName}`,
            htmlBody: emailContent,
            inlineImages,
        })
    }
}

function addQuestionToTable(table: GoogleAppsScript.HTML.HtmlOutput, i: number, response: string | string[] | string[][], question: string) {
    table.append('<tr><td>')
        .appendUntrusted((i + 1).toString())
        .append('</td><th>')
        .appendUntrusted(question)
        .append('</th><td>')
    if (Array.isArray(response)) {
        for (let j = 0; j < response.length; j++) {
            if (Array.isArray(response[j])) {
                for (let k = 0; k < response[j]!.length; k++) {
                    table.appendUntrusted(response[j]![k]!)
                    if (k !== response[j]!.length - 1) {
                        table.append(',')
                    }
                }
            } else {
                table.appendUntrusted(response[j] as string)
                if (j !== response.length - 1) {
                    table.append('<br>')
                }
            }
        }
    } else {
        table.appendUntrusted(response.toString())
            .append('</td></tr>')
    }
}

export function printResponseIds() {
    const form = FormApp.getActiveForm()
    for (const r of form.getResponses()) {
        const resps = r.getItemResponses()
        console.log(r.getId(), resps[0]!.getResponse(), r.getEditResponseUrl())
    }
}

/**
 * @param {string} str
 */
export function parseDate(str: string) {
    str = str.replace(/\s+/, '')
    // try czech format
    const d = new Date()
    const zoneH = d.getTimezoneOffset() / 60
    const zoneM = d.getTimezoneOffset() % 60
    const zone = `${zoneH > 0 ? '+' : ''}${Math.floor(zoneH)}${zoneM}`
    const parts = str.split('.', 3)
    let parsed
    if (parts.length == 3 && parts[2]!.length) {
        parsed = Utilities.parseDate(str, zone, 'dd.MM.yyyy')
    } else {
        parsed = Utilities.parseDate(str, zone, 'dd.MM')
        if (parsed) {
            parsed.setFullYear(d.getFullYear())
        }
    }
    if (parsed) {
        return parsed
    } else {
        return new Date(str)
    }
}

export function test() {
    const form = FormApp.openById('1XfBawBAkNp8jHmnwtQibvDlfxZHE1uK1G-39ap-3dVM')
    const response = form.getResponses()[0]
    onSubmitForm({
        source: form,
        response: response!,
    } as any)
}
