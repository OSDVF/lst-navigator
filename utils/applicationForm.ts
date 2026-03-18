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
        setInternal,
        setSecrets,
        fetch: fetchApi,
    }
}
