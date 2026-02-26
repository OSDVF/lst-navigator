import { doc, getDoc } from 'firebase/firestore'
import { useFirestore } from './firebase'
import { findTriggers } from './triggers'

export type AppSettings = {
    apiKey: string,
    projectId: string,
    appId: string,
}

/**
 * YYYYY-MM-D
 */
export type FirebaseDate = string

export type Category = {
    name: string,
    deadline: FirebaseDate,
    price: number,
}

export type ExtraItem = {
    name: string,
    price: number,
}

export type DocumentSettings = {
    /**
     * Path of a document in Firebase in which per-event additional settings are stored
     */
    remoteEventSettings: string,
}

export type EventSettings<Template = GoogleAppsScript.HTML.HtmlTemplate> = {
    accountNumber: string,
    adminEmail: string,
    bankCode: string,
    currency: string,
    emailHeadNew: Template,
    emailHeadEdited: Template,
    emailBody: Template,
    eventName: string,
    extras: ExtraItem[],
    messageTemplate: Template,
    priceCategories: Category[],
    priceExpression: string,
    mainOrg: string,
    responsesCollection: string,
    treatAllAsNew: boolean
}

export async function getEventSettings(): Promise<Partial<EventSettings>> {
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

    const settings: Partial<EventSettings> = {
        accountNumber: docProps.getProperty('accountNumber') ?? undefined,
        adminEmail: docProps.getProperty('adminEmail') ?? undefined,
        bankCode: docProps.getProperty('bankCode') ?? undefined,
        currency: docProps.getProperty('currency') ?? undefined,
        eventName,
        extras,
        messageTemplate: HtmlService.createTemplateFromFile('Message'),
        priceCategories: prices,
        priceExpression: docProps.getProperty('priceExpression') ?? undefined,
        mainOrg: docProps.getProperty('mainOrg') ?? undefined,
        responsesCollection: docProps.getProperty('responsesCollection') ?? undefined,
        treatAllAsNew: docProps.getProperty('treatAllAsNew') == 'true',
    }

    try {
        const remotePath = docProps.getProperty('remoteEventSettings')
        if (!remotePath) {
            throw new Error('Remote event settings document path not set')
        }
        const fs = useFirestore()

        const remote = (await getDoc(doc(fs, remotePath))).data() as EventSettings<string>
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

export function getAppSettings(): Partial<AppSettings> {
    return PropertiesService.getScriptProperties().getProperties()
}