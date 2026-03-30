import { getEventSettings } from './settings'
import type { EmailTemplateVars } from './types'
import { updateResponse } from './responses'

export function onSubmitForm(e: GoogleAppsScript.Events.FormsOnFormSubmit) {
    const settings = getEventSettings(e.source)
    const content = resolveEmailContent(settings, e.source, e.response)

    if (settings.adminEmail) {
        MailApp.sendEmail({
            to: settings.adminEmail,
            subject: content.edited ? `Úprava přihlášky ${content.respondentAddress}` : `Přihláška na ${settings.eventName} - ${content.respondentAddress}`,
            htmlBody: content.htmlBody,
            inlineImages: content.inlineImages,
        })
    }

    sendRespondentEmail(settings, content)
}

export function sendRespondentEmail(settings: ReturnType<typeof getEventSettings>, content: ReturnType<typeof resolveEmailContent>) {
    if (content.respondentAddress) {
        MailApp.sendEmail({
            to: content.respondentAddress,
            subject: content.edited ? `${settings.eventName} - Úprava přihlášky` : `Přihláška na ${settings.eventName}`,
            htmlBody: content.htmlBody,
            inlineImages: content.inlineImages,
        })
        return true
    }
    return false
}

export function resolveEmailContent(settings: ReturnType<typeof getEventSettings>, form: GoogleAppsScript.Forms.Form, response: GoogleAppsScript.Forms.FormResponse, generateQRCodes = true, dry = false) {
    const canEdit = form.canEditResponse()
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
        donation: 0,
        donationQrCode: false,
        editLink: response.getEditResponseUrl(),
        responseId: response.getId(),
        timestampUTC: new Date().toUTCString(),
        canEdit: canEdit,
        questionResponses: itemResponses.map(r => {
            let response = r.getResponse()
            const concat = (p: string, c: string) => `${p}, ${c}`
            if (Array.isArray(response)) {
                response = response.map(rr => Array.isArray(rr) ? rr.reduce(concat, '') : rr).reduce(concat, '')
            }
            return {
                title: r.getItem().getTitle(),
                description: r.getItem().getHelpText(),
                response,// it's now just a stirng, yay!
            }
        }),
        qrCode: false,
        price: 0,
    }
    if (settings.symbolTemplate) {
        Object.assign(settings.symbolTemplate, templateVars)
        templateVars.vs = parseInt(settings.symbolTemplate?.evaluate().getContent())
    }
    if (settings.donationSymbolTemplate) {
        Object.assign(settings.donationSymbolTemplate, templateVars)
        templateVars.donationSymbol = parseInt(settings.donationSymbolTemplate?.evaluate().getContent())
    }
    if (settings.messageTemplate) {
        Object.assign(settings.messageTemplate, templateVars)
        templateVars.message = settings.messageTemplate?.evaluate().getContent()
    }
    if (settings.donationMessageTemplate) {
        Object.assign(settings.donationMessageTemplate, templateVars)
        templateVars.donationMessage = settings.donationMessageTemplate?.evaluate().getContent()
    }

    {
        // prevent eval from accessing global scope variables
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const ScriptApp = undefined
        const Utilities = undefined
        const FormsApp = undefined
        const MailApp = undefined
        const UrlFetchApp = undefined
        const PropertiesService = undefined
        const useFirestore = undefined
        const {
            accountNumber, adminEmail, bankCode, currency, eventName, extras, mainOrg, priceCategories, donation, donationQrCode, editLink, responseId, timestampUTC, canEdit, questionResponses, price, qrCode, donationMessage, donationSymbol, message, treatAllAsNew, vs }
            = templateVars
        if (settings.priceExpression) {
            templateVars.price = eval(`(function(){return ${settings.priceExpression}})()`)
        }
        if (settings.donationExpression) {
            templateVars.donation = eval(`(function(){return ${settings.donationExpression}})()`)
        }
    }

    const inlineImages: Record<string, GoogleAppsScript.Base.Blob> = {}
    if (generateQRCodes) {
        function addQRCode(amount: number, message?: string, vs?: number) {
            try {
                const qrRequest = UrlFetchApp.fetch(`https://api.paylibo.com/paylibo/generator/czech/image?compress=false&size=400&accountNumber=${settings.accountNumber}&bankCode=${settings.bankCode}&amount=${amount}&currency=${settings.currency}&message=${encodeURIComponent(message ?? '')}&vs=${vs ?? ''}`)
                const code = qrRequest.getResponseCode()
                if (code == 200) {
                    const qrBlob = qrRequest.getBlob()
                    const imageId = `qrCode${Date.now().toString(36).substring(3)}`
                    qrBlob.setName(imageId)
                    inlineImages[imageId] = qrBlob
                    return imageId
                } else {
                    console.warn('QR code generate response: ', code, qrRequest.getContentText(), qrRequest.getHeaders())
                }
            } catch (e) {
                console.error(e)
            }
        }
        if (templateVars.price) {
            templateVars.qrCode = addQRCode(templateVars.price, templateVars.message, templateVars.vs) ?? false
        }
        if (templateVars.donation) {
            templateVars.donationQrCode = addQRCode(templateVars.donation, templateVars.donationMessage, templateVars.donationSymbol) ?? false
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
        edited = updateResponse(form, response, dry) ?? false
        if (edited) {
            const head = settings.emailHeadEdited ?? settings.emailHeadNew
            if (head) {
                headContent = head.evaluate().getContent()
            }
        } else if (settings.emailHeadNew) {
            headContent = settings.emailHeadNew.evaluate().getContent()
        }

    } catch (e) {
        console.warn(e)
    }
    if (!headContent && settings.emailHeadNew) {
        headContent = settings.emailHeadNew.evaluate().getContent()
    }

    const htmlBody = headContent + table.getContent() + (settings.emailBody ? settings.emailBody.evaluate().getContent() : '')

    return {
        respondentAddress,
        htmlBody,
        edited,
        inlineImages,
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
    const form = FormApp.openById('')
    const response = form.getResponses()[0]
    onSubmitForm({
        source: form,
        response: response!,
    } as any)
}

