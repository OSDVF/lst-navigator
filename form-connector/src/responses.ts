import path from "path"
import { useFirestore } from "./firestore"
import { getEventSettings, getSecrets, type ApplicationFormSecrets, type EventSettingsTemplated, type SyncState } from "./settings"
import type Firestore from "firestore_google-apps-script/Firestore"
import isEqual from "lodash.isequal"

export enum ApplicationState {
    NEW = 0, CONFIRMED = 1, REJECTED = 2, CANCELLED = 3
}

export type QuestionResponse = {
    id: number,
    title: string,
    responses: string | string[] | string[][]
}

export type ResponseRecord = {
    confirmationSent?: boolean,
    email: string,
    /**
     * Will be negative when deleted
     */
    edits: number,
    editLink: string,
    editTimestamp: number,
    oldQuestions?: QuestionResponse[],
    questions: QuestionResponse[],
    timestamp: number,
    state?: ApplicationState,
}

export function updateResponse(form: GoogleAppsScript.Forms.Form, response: GoogleAppsScript.Forms.FormResponse, dry = false): boolean | undefined {
    const formId = form.getId()
    const secrets = getSecrets(formId)
    const fs = useFirestore(formId, secrets as ApplicationFormSecrets)
    const settings = getEventSettings(form, fs)

    const resps = form.getResponses()

    if (settings.responsesCollection) {
        if (responsesSyncDirty(settings, resps)) {// todo maybe find the most recent?
            refreshResponsesData(form, fs, settings, response, dry)
        } else {
            const respDocPath = path.join(settings.responsesCollection!, response.getId())
            const responseRecord = fs.getDocument(respDocPath).obj as ResponseRecord | undefined
            const result = updateResponseData(fs, settings, response, responseRecord, dry)

            if (!dry) {
                fs.updateDocument(secrets.remoteEventSettings!, {
                    responsesSync: new Date().getTime(),
                } as SyncState, true)
            }

            return result
        }
    } else {
        console.warn("Responses collection not set for " + formId)
    }
}

function responsesSyncDirty(settings: Partial<EventSettingsTemplated<GoogleAppsScript.HTML.HtmlTemplate> & SyncState>, resps: GoogleAppsScript.Forms.FormResponse[]) {
    return (settings.responsesSync ?? 0) < (resps.findLast(r => r.getTimestamp())?.getTimestamp().getTime() ?? 0)
}

export function refreshResponses(form: GoogleAppsScript.Forms.Form, force: boolean = false, dry = false) {
    const formId = form.getId()
    const secrets = getSecrets(formId)
    const fs = useFirestore(formId, secrets as ApplicationFormSecrets)
    const settings = getEventSettings(form, fs)

    if (force || responsesSyncDirty(settings, form.getResponses())) {
        return refreshResponsesData(form, fs, settings, undefined, dry) // TODO proč se neobnovuje when calle from live
    } else {
        return {
            new: 0,
            changed: 0,
        }
    }
}

function extractQuestionResponses(response: GoogleAppsScript.Forms.FormResponse): QuestionResponse[] {
    return response.getItemResponses().map(ir => ({
        id: ir.getItem().getId(),
        title: ir.getItem().getTitle(),
        responses: ir.getResponse()
    }))
}

function updateResponseData(fs: Firestore, settings: Awaited<ReturnType<typeof getEventSettings>>, response: GoogleAppsScript.Forms.FormResponse, responseRecord?: ResponseRecord, dry = false) {
    const respondentAddress = response.getRespondentEmail()
    const respDocPath = path.join(settings.responsesCollection!, response.getId())
    if (responseRecord && !settings.treatAllAsNew) {
        const newResponses = extractQuestionResponses(response)
        if (isEqual(responseRecord.questions, newResponses)) {
            // nothing to update
            return false
        }

        if (!dry) {
            responseRecord.questions = newResponses
            responseRecord.edits = responseRecord.edits + 1
            responseRecord.editTimestamp = response.getTimestamp()?.getTime() ?? new Date().getTime()
            responseRecord.email = responseRecord.email ?? respondentAddress
            if (!responseRecord.oldQuestions && responseRecord.questions) {
                responseRecord.oldQuestions = responseRecord.questions
            }

            fs.updateDocument(respDocPath, responseRecord, true)
        }
        return true
    } else if (!dry) {
        responseRecord = {
            email: respondentAddress,
            edits: 0,
            editLink: response.getEditResponseUrl(),
            editTimestamp: response.getTimestamp()?.getTime() ?? new Date().getTime(),
            questions: extractQuestionResponses(response),
            timestamp: response.getTimestamp()?.getTime() ?? new Date().getTime(),
        }
        fs.createDocument(respDocPath, responseRecord)
    }
    return false
}

function refreshResponsesData(form: GoogleAppsScript.Forms.Form, fs: Firestore, settings: Awaited<ReturnType<typeof getEventSettings>>, response?: GoogleAppsScript.Forms.FormResponse, dry = false) {
    const formResponses = [...form.getResponses(), ...(response ? [response] : [])]
    let changed = 0
    let added = 0

    const stored = fs.getDocuments(settings.responsesCollection!)
    try {
        for (const s of stored) { // update existing records
            const record = s.obj as ResponseRecord
            const i = formResponses.findIndex(r => r.getId() == path.basename(s.path!))
            if (i == -1) {
                if (record.edits >= 0) {//not yet marked as deleted
                    if (!dry) {
                        if (record.edits == 0) {
                            record.edits = -1
                        }
                        else {
                            record.edits = Math.min(record.edits, -record.edits)
                        }
                        fs.updateDocument(s.path!, record, true)
                    }
                    changed++
                }
            }
            else {
                const response = formResponses[i]!
                if (updateResponseData(fs, settings, response, record, dry)) {
                    changed++
                }
                formResponses.splice(i, 1)
            }
        }
        for (const r of formResponses) { // create records for not stored responses
            if (!updateResponseData(fs, settings, r, undefined, dry)) {
                added++
            }
        }
    } finally {
        if (!dry) {
            const secrets = getSecrets(form.getId())
            fs.updateDocument(secrets.remoteEventSettings!, {
                responsesSync: new Date().getTime(),
            } as SyncState, true)
        }
    }
    return {
        changed,
        new: added,
    }
}
