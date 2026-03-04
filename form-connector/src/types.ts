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

export type EmailTemplateVars = {
    editLink: string,
    responseId: string,
    canEdit: boolean,
    qrCode: string | boolean,
    donationQrCode: string | boolean,
    message?: string,
    vs?: number,
    donationMessage?: string,
    donationSymbol?: number,
    price: number,
    donation: number,
} & Partial<Omit<EventSettings<void>, 'priceExpression' | 'emailBody' | 'emailHeadNew' | 'emailHeadEdited' | 'messageTemplate' | 'symbolTemplate' | 'donationMessageTemplate' | 'donationSymbolTemplate'>>

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