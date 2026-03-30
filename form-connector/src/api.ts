import { useFirestore } from './firestore'
import { refreshResponses, type ResponseRecord } from './responses'
import { getEventSettings, getSecrets, type ApplicationFormSecrets, type SyncState } from './settings'

export type Action = keyof Actions
export type Actions = {
    getSettings: {
        formId: string,
    },
    getInternal: {
        formId: string,
    },
    sendPendingEmails: {
        formId: string,
        /**
         * Response IDs to filter
         */
        responseIds?:string[]
    },
    sendRespondentEmail: {
        formId: string,
        responseId: string,
        overrideAddress: string,
    },
    setInternal: {
        [formId: string]: InternalSettings
    },
    setSecrets: {
        [formId: string]: ApplicationFormSecrets
    },
    refreshResponses: {
        formId: string,
        force?: boolean,
    }
}

export type Responses = {
    /** AppSecrets.remoteEventSettings value */
    getSettings: string,
    getInternal: {
        secretsExist: boolean,
    } & InternalSettings,
    refreshResponses: {
        new: number,
        changed: number,
    },
    sendRespondentEmail: void,
    /** Returns email adresses */
    sendPendingEmails: string[],
    setSecrets: void,
    setInternal: void,
}

export type ApiResponse<T> = {
    ok: boolean,
    error?: {
        code: string,
        http: number,
        message: string,
        stack?: string,
    },
    data?: T,
}

export type InternalSettings = {
    canEditResponse: boolean,
}

export function doGet(e: GoogleAppsScript.Events.DoGet) {
    try {
        if (!e.pathInfo) {
            return createResonse({
                ok: false,
                error: {
                    code: 'Bad Request',
                    http: 400,
                    message: 'Request must be targeted to /action/ and have query string parameter body=jsonFormattedBody',

                },
            })
        }
        const body = typeof e.parameter.body == 'string' ? JSON.parse(e.parameter.body) : null
        if (!body) {
            return createResonse({
                ok: false,
                error: {
                    code: 'Bad Request',
                    http: 400,
                    message: 'Request must have query string parameter body=jsonFormattedBody',
                },
            })
        }

        return processRequest(e.pathInfo as Action, body)

    } catch (e) {
        console.error(e)
        return createResonse({
            ok: false,
            error: {
                code: 'Internal Server Error',
                http: 500,
                message: typeof e == 'object' ? (e && 'message' in e) ? e.message : e : e as any,
                stack: typeof e == 'object' ? (e && 'stack' in e) ? e.stack as any : undefined : undefined,
            },
        })
    }
}

export function doPost(e: GoogleAppsScript.Events.DoPost) {
    if (e.postData.type != 'text/plain') {
        return createResonse({
            ok: false,
            error: {
                code: 'Unsupported Media Type',
                http: 415,
                message: 'Only content type text/plain is supported',

            },
        })
    }
    try {
        const postData: {
            action: Action,
            body: any,
        } = JSON.parse(e.postData.contents)
        return processRequest(postData.action, postData.body)
    } catch (e) {
        console.error(e)
        return createResonse({
            ok: false,
            error: {
                code: 'Internal Server Error',
                http: 500,
                message: typeof e == 'object' ? (e && 'message' in e) ? e.message : e : e as any,
                stack: typeof e == 'object' ? (e && 'stack' in e) ? e.stack as any : undefined : undefined,
            },
        })
    }
}

function processRequest(action: Action, body: any) {
    if (typeof action != 'string' || !action || typeof body != 'object' || !body) {
        return createResonse({
            ok: false,
            error: {
                code: 'Bad Request',
                http: 400,
                message: 'Body must be formatted as {action: string, body: ...}',

            },
        })
    }

    switch (action) {
        case 'setSecrets':
            return _setSecrets(body)
        case 'getSettings':
            return _getSecrets(body)
        case 'getInternal':
            return _getInternal(body)
        case 'setInternal':
            return _setInternal(body)
        case 'refreshResponses':
            return _refreshResponses(body)
        case 'sendPendingEmails':
            return _sendPendingEmails(body)
        case 'sendRespondentEmail':
            return _sendRespondentEmail(body)
        default:
            return createResonse({
                ok: false,
                error: {
                    code: 'Bad Request',
                    http: 400,
                    message: 'Unknown action ' + action,

                },
            })
    }


}

function createResonse<T>(response: ApiResponse<T>) {
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON)
}

function _getInternal(body: Record<string, string>) {
    if (typeof body.formId == 'string' && body.formId) {
        const form = FormApp.openById(body.formId)
        let fsOrError
        try {
            fsOrError = useFirestore(body.formId)
        } catch (e) {
            if (e instanceof Error) {
                fsOrError = e.message
                console.log(e.message)
            }
        }
        return createResonse<Responses['getInternal']>({
            ok: true,
            data: {
                secretsExist: typeof fsOrError != 'string',
                canEditResponse: form.canEditResponse(),
            }
        })
    } else {
        return createResonse({
            ok: false,
            error: {
                code: 'Bad Request',
                http: 400,
                message: 'Action body must be formatted as {formId: string}',

            },
        })
    }
}

function _getSecrets(body: Record<string, string>) {
    if (typeof body.formId == 'string' && body.formId) {
        const fs = useFirestore(body.formId)
        const settings = getSecrets(body.formId)
        if (!settings.remoteEventSettings) {
            return createResonse({
                ok: false,
                error: {
                    code: 'Not Found',
                    http: 404,
                    message: 'No settings found for the provided formId',

                },
            })
        }

        const remoteSettings = fs.getDocument(settings.remoteEventSettings).obj
        return createResonse({
            ok: true,
            data: remoteSettings,
        })
    } else {
        return createResonse({
            ok: false,
            error: {
                code: 'Bad Request',
                http: 400,
                message: 'Action body must be formatted as {formId: string}',

            },
        })
    }
}

function _refreshResponses(body: Record<string, string | boolean>) {
    if (typeof body.formId == 'string' && body.formId) {
        const form = FormApp.openById(body.formId)
        let fsOrError
        try {
            fsOrError = useFirestore(body.formId)
        } catch (e) {
            if (e instanceof Error) {
                fsOrError = e.message
                console.log(e.message)
            }
        }
        return createResonse<Responses['refreshResponses']>({
            ok: true,
            data: refreshResponses(form, typeof body.force == 'boolean' ? body.force : false)
        })
    } else {
        return createResonse({
            ok: false,
            error: {
                code: 'Bad Request',
                http: 400,
                message: 'Action body must be formatted as {formId: string, force?: boolean}',
            },
        })
    }
}

function _sendPendingEmails(body: Actions['sendPendingEmails']) {
    if (typeof body.formId != 'string') {
        console.warn("Unexpected body: ", body)
        return createResonse({
            ok: false,
            error: {
                code: 'Bad Request',
                http: 400,
                message: 'Action body must be formatted as {formId: string}',
            },
        })
    }
    const form = FormApp.openById(body.formId)
    const fs = useFirestore(body.formId)
    const settings = getEventSettings(form, fs)
    if(!settings.responsesCollection) {
        throw Error('Responses collection not set for ' + body.formId)
    }
    const documents = fs.getDocuments(settings.responsesCollection, Array.isArray(body.responseIds) ? body.responseIds : undefined)
    for(const doc of documents) {
        const record = doc.obj as ResponseRecord
    }
}

function _sendRespondentEmail(body: Actions['sendRespondentEmail']) {

}

function _setInternal(body: Record<string, InternalSettings>) {
    for (const key in body) {
        const formSettings = body[key]!
        if ('canEditResponse' in formSettings &&
            typeof formSettings.canEditResponse == 'boolean'
        ) {
            const form = FormApp.openById(key)
            form.setAllowResponseEdits(formSettings.canEditResponse)

            return createResonse({ ok: true })
        } else {
            console.warn("Unexpected body: ", body)
            return createResonse({
                ok: false,
                error: {
                    code: 'Bad Request',
                    http: 400,
                    message: 'Action body must be formatted as {[formId]: {canEditResponse: boolean}}',
                },
            })
        }
    }
}

function _setSecrets(body: Record<string, ApplicationFormSecrets>) {
    for (const key in body) {// TODO support multiple forms
        const secrets = body[key]!
        if ('email' in secrets && typeof secrets.email == 'string' &&
            typeof secrets.key == 'string' &&
            typeof secrets.projectId == 'string' &&
            typeof secrets.remoteEventSettings == 'string'
        ) {
            PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(secrets))

            const fs = useFirestore(key, secrets)
            const remoteSettings = fs.getDocument(secrets.remoteEventSettings)
            const ok = !!remoteSettings
            return createResonse({ ok })
        } else {
            console.warn("Unexpected body: ", body)
            return createResonse({
                ok: false,
                error: {
                    code: 'Bad Request',
                    http: 400,
                    message: 'Action body must be formatted as {[formId]: {email: string, key: string, projectId: string, remoteEventSettings: string}}',
                },
            })
        }
    }
}