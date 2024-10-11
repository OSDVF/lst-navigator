import type { CollectionReference, DocumentReference, FieldValue } from 'firebase/firestore'

export type FeedbackType = 'basic' | 'complicated' | 'parallel' | 'select' | 'text'
export type FeedbackConfig = {
    group?: string | RegExp, // title of parts of schedule to group by
    title: string,
    individual: {
        name: string,
        questions: string[]
        type?: FeedbackType,
        description?: string
    }[],
}
export type ScheduleItem = {
    color?: string
    notify?: string[]
    subtitle?: string
    title?: string
    time?: number
    feedbackType?: FeedbackType,
    detailQuestion?: string,
    description?: string,
    questions?: string[],
    icon?: string // iconify code
}

export type ScheduleDay = {
    cooking: string | null,
    date: string,
    dishes: string | null,
    manager: string | null,
    name: string,
    program: ScheduleItem[],
};

export type EventSubcollection = 'notes' | 'feedback' | 'feedbackConfig' | 'subscriptions' | 'schedule' | 'users'
export const EventSubcollectionsList: EventSubcollection[] = ['notes', 'feedback', 'feedbackConfig', 'subscriptions', 'schedule', 'users']
export type EventDocs = {
    [K in EventSubcollection]: CollectionReference
} & {
    event: DocumentReference,
};

export type EventDescription<T = string> = {
    title: string,
    start: string, // in format 2023-01-30
    end: string,

    description: string,
    subtitle: string,
    image: {
        type: 'cloud' | 'url',
        data: string, // url
    },
    feedbackConfig: FeedbackConfig[],// subcollection
    feedbackInfo: string,
    groups: string[],
    web: string
} & {
    [key in EventSubcollection]: T
}

export type Permissions = {
    superAdmin: boolean,
    /**
     * Also has access to the administrator section and can edit feedback results
     */
    editEvent: boolean,
    /**
     * Can edit schedule on this event and has access to feedback results
     */
    editSchedule: boolean,
}

export enum UserLevel {
    Nothing,
    /// Can edit schedule of one event
    ScheduleAdmin,
    /// Can edit schedule and users of one event
    Admin,
    /// Can manage all events
    SuperAdmin
}

export const userLevelToIcon = {
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

export type Feedback = FeedbackOr<undefined>
export type FeedbackQuestionsProgram = { [question: number]: { [user: string]: Feedback } }
export type FeedbackQuestionsCustom = { [question: string]: { [user: string]: Feedback } }
export type FeedbackSections = { [section: string]: number | FeedbackQuestionsProgram & FeedbackQuestionsCustom }

export type FeedbackOr<T> = {
    basic?: number | T,
    detail?: string | T,
    complicated?: (number | null)[],
    select?: string | T
}

export type TabulatedFeedback = {
    replies: { [key: string | number]: (Feedback | null)[] },
    respondents: string[]
}

export type Subscriptions = /* array of notification groups */string[] | true /* subscribe to all groups */
