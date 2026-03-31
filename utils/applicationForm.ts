import * as Sentry from '@sentry/nuxt'

import type { ApplicationFormSecrets } from '~/form-connector/src/settings'
import type { Action, Actions, ApiResponse, InternalSettings, Responses } from '~/form-connector/src/api'

export function useApplicationForm() {
    const config = useRuntimeConfig()

    function setSecrets(formId: string, secrets: ApplicationFormSecrets) {
        return fetchApi('setSecrets', {
            [formId]: secrets,
        })
    }
    function getInternal(formId: string) {
        return fetchApi('getInternal', {
            formId,
        })
    }
    function setInternal(formId: string, settings: InternalSettings) {
        return fetchApi('setInternal', {
            [formId]: settings,
        })
    }
    function refreshResponses(formId: string, force?: boolean) {
        return fetchApi('refreshResponses', {
            formId,
            force,
        })
    }

    async function fetchApi<A extends Action, T extends Actions[A]>(action: A, body: T): Promise<ApiResponse<Responses[A]>> {
        const res = await fetch(config.public.applicationFormApi, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({
                action,
                body,
            }),
            redirect: 'follow',
            credentials: 'omit',
        })
        try {
            const json = await res.json()
            return json
        } catch (e) {
            console.error(e)
            console.warn('API response ', await res.text())
            throw e
        }
    }

    return {
        getInternal,
        refreshResponses,
        setInternal,
        setSecrets,
        fetch: fetchApi,
    }
}


export async function useApplicationFormData(id: string, error?: MaybeRef) {
    const errorRef = maybe(error, e => toRef(e))
    const ui = useUI()

    const _formData = ref<gapi.client.forms.Form>({//dummy value
        publishSettings: {
            publishState: {
                isAcceptingResponses: false,
                isPublished: false,
            },
        },
        items: [],
        linkedSheetId: '',
        settings: {
            emailCollectionType: 'RESPONDER_INPUT',
            quizSettings: {
                isQuiz: false,
            },
        },
        revisionId: undefined,
    })

    const wantedFields = 'settings/*,publishSettings/*,items/*,linkedSheetId,revisionId'

    try {
        const gapi = useGapi()
        const client = await gapi.client()
        const instance = getCurrentInstance()
        if(instance && !instance.isMounted) {
            onMounted(hydrateFormData)
        } else {
            hydrateFormData()
        }

        async function hydrateFormData() {
            using _ = ui.loading()
            const response = await client.forms.forms.get({
                formId: id,
                fields: wantedFields,
            })
            if ((response.status ?? 0) >= 400 && errorRef) {
                errorRef.value = response.statusText
            }
            else {
                _formData.value = response.result
            }
        }
        const formData = computed({
            get() {
                return _formData.value
            },
            set(newValue: gapi.client.forms.Form) {
                ui.startLoading()
                client.forms.forms.batchUpdate({
                    formId: id,
                    fields: wantedFields,
                }, {
                    includeFormInResponse: true,
                    requests: [
                        ...(newValue.settings != _formData.value.settings ? [{
                            updateSettings: {
                                settings: newValue.settings,
                                updateMask: '*',
                            },
                        }] as gapi.client.forms.Request[] : []),
                    ],
                    writeControl: {
                        targetRevisionId: _formData.value.revisionId,
                    },
                }).then(result => {
                    if ((result.status ?? 0) >= 400 || !result.result.form) {
                        errorRef.value = result.statusText || 'Failed to retrieve form result'
                    } else {
                        _formData.value = result.result.form
                    }
                }).finally(ui.startLoading)
            },
        })
        return formData
    } catch (e) {
        console.error(e)
        Sentry.captureException(e)
        return _formData
    }
}