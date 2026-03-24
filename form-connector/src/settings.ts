import { useFirestore } from './firestore'
import { findTriggers } from './triggers'
import type Firestore from 'firestore_google-apps-script/Firestore'
import type { Category, EventSettings, ExtraItem } from './types'

export type ApplicationFormSecrets = {
    email: string,
    projectId: string,
    key: string,
    /**
     * Path of a document in Firebase in which per-event additional settings are stored
     */
    remoteEventSettings: string,
}

export type EventSettingsTemplated<T = GoogleAppsScript.HTML.HtmlTemplate> = EventSettings<T>
export type SyncState = {
    responsesSync: number,
}

export function getEventSettings(formId: string, fs?: Firestore): Partial<EventSettingsTemplated & SyncState> {
    const docProps = PropertiesService.getDocumentProperties()// Document properties are fallback when firestore doesn't work
    const form = FormApp.getActiveForm()
    const eventName = docProps.getProperty('eventName') || form.getTitle()
    let extras: ExtraItem[] = []
    const e = docProps.getProperty('extras')
    if (e) {
        extras = e.split(',').map(e => {
            const [name, price] = e.split(':').map(e => e.trim())
            if (!name || !price) {
                throw new Error('Wrong extra prices definition')
            }
            return {
                name,
                price: parseFloat(price),
            }
        })
    }

    let prices: Category[] = []
    const c = docProps.getProperty('extras')
    if (c) {
        prices = c.split(',').map(c => {
            const [name, deadline, price] = c.split(':').map(e => e.trim())
            if (!name || !deadline || !price) {
                throw new Error('Wrong categories definition')
            }
            return {
                name,
                deadline,
                price: parseFloat(price),
            }
        })
    }

    const settings: Partial<EventSettingsTemplated> = {
        accountNumber: docProps.getProperty('accountNumber') ?? undefined,
        adminEmail: docProps.getProperty('adminEmail') ?? undefined,
        bankCode: docProps.getProperty('bankCode') ?? undefined,
        currency: docProps.getProperty('currency') ?? undefined,
        donationExpression: docProps.getProperty('donationExpression') ?? undefined,
        donationMessageTemplate: HtmlService.createTemplateFromFile('DonationMessage'),
        donationSymbolTemplate: HtmlService.createTemplateFromFile('DonationSymbol'),
        eventName,
        extras,
        messageTemplate: HtmlService.createTemplateFromFile('Message'),
        priceCategories: prices,
        priceExpression: docProps.getProperty('priceExpression') ?? undefined,
        mainOrg: docProps.getProperty('mainOrg') ?? undefined,
        responsesCollection: docProps.getProperty('responsesCollection') ?? undefined,
        symbolTemplate: HtmlService.createTemplateFromFile('Symbol'),
        treatAllAsNew: docProps.getProperty('treatAllAsNew') == 'true',
    }

    try {
        const secrets = getSecrets(formId)
        if (!secrets.remoteEventSettings) {
            throw new Error('Remote event settings document path not set')
        }
        const fs2 = fs ?? useFirestore(formId, secrets as ApplicationFormSecrets)

        const remote = fs2.getDocument(secrets.remoteEventSettings).obj as EventSettings<string> & SyncState
        Object.assign(settings, remote)
        if (remote) {
            if (remote.emailBody) {
                settings.emailBody = HtmlService.createTemplate(remote.emailBody)
            }
            if (remote.emailHeadEdited) {
                settings.emailHeadEdited = HtmlService.createTemplate(remote.emailHeadEdited)
            }
            if (remote.emailHeadNew) {
                settings.emailHeadNew = HtmlService.createTemplate(remote.emailHeadNew)
            }
            if (remote.messageTemplate) {
                settings.messageTemplate = HtmlService.createTemplate(remote.messageTemplate)
            }
            if (remote.symbolTemplate) {
                settings.symbolTemplate = HtmlService.createTemplate(remote.symbolTemplate)
            }
            if (remote.donationMessageTemplate) {
                settings.donationMessageTemplate = HtmlService.createTemplate(remote.donationMessageTemplate)
            }
            if (remote.donationSymbolTemplate) {
                settings.donationSymbolTemplate = HtmlService.createTemplate(remote.donationSymbolTemplate)
            }
        }
    } catch (e) {
        console.warn(e, 'Using only document-contained settings')
    }
    if (!settings.emailBody) {
        settings.emailBody = HtmlService.createTemplateFromFile('EmailBody')
    }
    if (!settings.emailHeadEdited) {
        settings.emailHeadEdited = HtmlService.createTemplateFromFile('EmailHeadEdited')
    }
    if (!settings.emailHeadNew) {
        settings.emailHeadNew = HtmlService.createTemplateFromFile('EmailHeadNew')
    }
    if (!settings.messageTemplate) {
        settings.messageTemplate = HtmlService.createTemplateFromFile('Message')
    }
    if (!settings.symbolTemplate) {
        settings.symbolTemplate = HtmlService.createTemplateFromFile('Symbol')
    }
    if (!settings.donationMessageTemplate) {
        settings.donationMessageTemplate = HtmlService.createTemplateFromFile('DonationMessage')
    }
    if (!settings.donationSymbolTemplate) {
        settings.donationSymbolTemplate = HtmlService.createTemplateFromFile('DonationSymbol')
    }
    return settings
}

const dummyProperties = new Proxy<Record<string | symbol, any>>({}, {
    get(target, name, r) {
        console.log('Dummy properties service called for ', name)
        return Reflect.get(target, name, r)
    },
    set(target, name, value: any, r) {
        console.log('Dummy properties service set for ', name, value)
        return Reflect.set(target, name, value, r)
    },
})

export function getSecrets(id: string): Partial<ApplicationFormSecrets> {
    return {
        ...JSON.parse(PropertiesService.getScriptProperties().getProperty(id) ?? '{}'),
        ...(PropertiesService.getDocumentProperties()?.getProperties() ?? {}),// the document properties (set for "active doc") override the script properties
    }
}