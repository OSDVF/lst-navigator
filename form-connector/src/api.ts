import { useFirestore } from './firestore'
import { getSecrets, type ApplicationFormSecrets } from './settings'
import type { EventSettings } from './types'

export type Action = 'setSecrets' | 'setInternal' | 'getSettings' | 'getInternal'
export type Actions = {
    setSecrets: {
        [formId: string]: ApplicationFormSecrets
    },
    getSettings: {
        formId: string,
    },
    getInternal: {
        formId: string,
    },
    setInternal: {
        [formId: string]: InternalSettings
    }
}

export type Responses = {
    setSecrets: void,
    setInternal: void,
    /** AppSecrets.remoteEventSettings value */
    getSettings: string,
    getInternal: InternalSettingsResponse,
}

export type ApiResponse<T> = {
    ok: boolean,
    error?: {
        code: string,
        http: number,
        message: string,
    },
    data?: T,
}

export type InternalSettings = {
    canEditResponse: boolean,
}
export type InternalSettingsResponse = {
    secretsExist: boolean,
} & InternalSettings

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
            body: Record<string, ApplicationFormSecrets>,
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

            },
        })
    }
}

function processRequest(action: Action, body: Record<string, ApplicationFormSecrets | InternalSettings>) {
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
            break
        case 'getSettings':
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
        case 'getInternal':
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
                return createResonse<InternalSettingsResponse>({
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
        case 'setInternal':
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
            break
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