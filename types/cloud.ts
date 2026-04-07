import type { CollectionReference, DocumentReference, FieldValue } from 'firebase/firestore'
import type { FirebaseDate } from '~/form-connector/src/types'

export type Application = {
    id: string,
    paid?: number,
    remaining?: number,
    /** Cells in applications table can be 'overlayed' with custom content by the manager */
    overlays?: ApplicationFields,
}

/** These fields have special meaning - the system will process their contents differently and rely on them */
export const SpecialApplicationFields = [
    /** Will be assigned to the start of event if not set */
    'arrival',
    /** Will be assigned to the start of event if not set */
    'departure',
    'firstMeal', 'lastMeal',
    /** Will have `tel:` link displayed */
    'phone', 'category',
    /** Type of food that the participant wants to order for the whole event */
    'food',
    'town',
    'extras',
    'name'] as const

export type SpecialApplicationFields = typeof SpecialApplicationFields[number]
export type ApplicationFormSettings = {
    values: {
        /**
         * ordered by time of day.
         * breakfast, lunch,...
         */
        mealNames: string[],
        eventFirstMeal: number,
        eventLastMeal: number,
    },
    fields:
    {
        [key in typeof SpecialApplicationFields[number]]?: string | number
    } & ApplicationFields
}

/** If the type is `string`, the field is searched by title. When `number`, it is searched by id. */
export type ApplicationFields = {
    [field: string]: string | number | undefined
}


export type FeedbackType = 'basic' | 'complicated' | 'parallel' | 'select' |
    /**
     * Same as 'complicated' but the questions will have only '0' or '1' values
     */
    'multiple' | 'text'
export type FeedbackConfig = {
    group?: string | RegExp, // title of parts of schedule to group by
    title: string,
    /**
     * falls back to true
     */
    dayTitles?: boolean,
    individual: {
        name: string,
        questions: string[]
        type?: FeedbackType,
        description?: string
    }[],
}

export type FeedbackOr<T> = {
    basic?: number | T,
    detail?: string | T,
    complicated?: (number | null)[],
    select?: string | T
}

export type Feedback = FeedbackOr<undefined>
export type FeedbackQuestionsProgram = { [question: number]: { [user: string]: Feedback } }
export type FeedbackQuestionsCustom = { [question: string]: { [user: string]: Feedback } }
export type FeedbackSections = { [section: string]: ({ updated: number, nickname?: string } | FeedbackQuestionsProgram & FeedbackQuestionsCustom) }

export type TabulatedFeedback = {
    replies: { [key: string | number]: (Feedback | null)[] },
    respondents: string[]
}

/** A single item in day's schedule */
export type ScheduleItem = {
    color?: string
    detailQuestion?: string,
    description?: string,
    feedbackType?: FeedbackType,
    icon?: string // iconify code
    /** Indef of `ScheduleDay.locations` */
    location?: number,
    questions?: string[],
    notify?: string[]
    subtitle?: string
    title?: string
    time?: number
}

export type ScheduleDay = {
    cooking: string | null,
    date: string,
    dishes: string | null,
    manager: string | null,
    name: string,
    locations?: string[],
    program: ScheduleItem[],
};

export type ApplicationsSubCollection = 'responses'
export const ApplicationsSubCollectionList: ApplicationsSubCollection[] = ['responses']
export type EventSubcollection = 'notes' | 'feedback' | 'feedbackConfig' | 'groups' | 'duties' | 'subscriptions' | 'schedule'
export const EventSubcollectionsList: EventSubcollection[] = ['notes', 'feedback', 'feedbackConfig', 'groups', 'duties', 'subscriptions', 'schedule']
export type EventDocs = {
    [K in EventSubcollection]: CollectionReference
} & {
    event: DocumentReference,
};

export type Group = {
    name: string,
    peopleIDs: string[],
}

export type EventDescription<T = string> = {
    /**
     * Let users show advanced settings
     */
    advanced?: boolean,
    adminLinks?: Record<string, string>
    applicationsEnd?: FirebaseDate,
    applicationsStart?: FirebaseDate,

    subtitle: string,
    title: string,

    start: FirebaseDate,
    end: FirebaseDate,

    description: string,
    /** URL of an application form responder link */
    form?: string,
    /** Full non-shortened URL of an editable Google Form */
    formDocument?: string,
    /** Date according to which the event should be ordered (instead of event start date) */
    order?: FirebaseDate,
    participantSection?: boolean,
    image?: {
        type: 'cloud' | 'external',
        data: string, // storage / external url
    },
    links?: Record<string, string>,
    feedbackConfig: FeedbackConfig[],// subcollection
    feedbackInfo: string,
    feedbackEnd?: FirebaseDate,

    showFrom?: FirebaseDate,
    showTo?: FirebaseDate,

    transfers?: boolean,
    web: string
} & {
    [key in EventSubcollection]: T
}


/**
 * `superAdmin` is global, other permissions are per-event
 */
export type Permissions = {
    /** Can view groups, duties and own application*/
    participant: boolean,
    showApplications: boolean,
    superAdmin: boolean,
    /**
     * Also has access to the administrator section and can edit feedback results
     */
    editEvent: boolean,
    /**
     * Can edit schedule on this event and has access to feedback results. Can edit user applications.
     */
    editSchedule: boolean,
}

export enum UserLevel {
    Nothing = 0,
    /// Show applications
    ShowApplications = 1,
    /// Can edit schedule of one event
    ScheduleAdmin = 2,
    /// Can edit schedule and users of one event
    Admin = 3,
    /// Can manage all events
    SuperAdmin = 4
}

export const userLevelToIcon = {
    [UserLevel.ShowApplications]: 'vote-outline',
    [UserLevel.SuperAdmin]: 'shield-lock-open',
    [UserLevel.ScheduleAdmin]: 'calendar-check',
    [UserLevel.Admin]: 'account-lock-open',
    [UserLevel.Nothing]: null,
}

export type UserInfo = {
    permissions: { [key: 'superAdmin' | string]: boolean | UserLevel }
    subscriptions: {
        [eventId: string]: string
    },
    /** Application responses IDs for different events */
    responseId?: {
        [eventId: string]: string
    },
    signature: {
        [eventId: string]: string
    },
    signatureId: {
        [eventId: string]: string
    },
    name?: string,
    email?: string,
    photoURL?: string,
    lastLogin: number,
    lastTimezone: number
}

export type UpdatePayload<T> = {
    [key in keyof T]: T[key] | UpdatePayload<T[key]> | FieldValue
}

export type UpdateRecordPayload<T> = {
    [key: string]: T | UpdateRecordPayload<T> | FieldValue
}

export type Subscriptions = /* array of notification groups */string[] | true /* subscribe to all groups */

export enum TransferStatus {
    None = 0, Request = 1, Reply = 2, Confirmed = 3, Transfered = 4
}
export type Transfer = {
    remote: string,
    status: TransferStatus,
}