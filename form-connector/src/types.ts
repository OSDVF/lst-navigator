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

export type SimplifiedQuestionResponse = {
    title: string,
    description: string,
    response: string
}

export type EmailTemplateVars = {
    canEdit: boolean,
    donation: number,
    donationQrCode: string | boolean,
    donationMessage?: string,
    donationSymbol?: number,
    editLink: string,
    timestampUTC: string,
    questionResponses: SimplifiedQuestionResponse[],
    qrCode: string | boolean,
    message?: string,
    price: number,
    responseId: string,
    vs?: number,
} & Partial<Omit<EventSettings<void>, 'responsesCollection' | 'donationExpression' | 'priceExpression' | 'emailBody' | 'emailHeadNew' | 'emailHeadEdited' | 'messageTemplate' | 'symbolTemplate' | 'donationMessageTemplate' | 'donationSymbolTemplate'>>

export type EventSettings<Template> = {
    accountNumber: string,
    adminEmail: string,
    bankCode: string,
    currency: string,
    donationExpression: string,
    donationMessageTemplate: Template,
    donationSymbolTemplate: Template,
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
    symbolTemplate: Template,
    treatAllAsNew: boolean
}