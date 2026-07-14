import { useFirestore } from "./firestore";
import { refreshResponses, type ResponseRecord } from "./responses";
import {
    getEventSettings,
    getSecrets,
    type ApplicationFormSecrets,
    type SyncState,
} from "./settings";
import { resolveEmailContent } from "./submit";
import type { EmailTemplateVars } from "./types";

export type Action = keyof Actions;
export type Actions = {
    getControls: {
        formId: string;
    };
    getSettings: {
        formId: string;
    };
    getInternal: {
        formId: string;
    };
    sendPendingEmails: {
        formId: string;
        /**
         * Response IDs to filter
         */
        responseIds?: string[];
    };
    sendRespondentEmail: {
        formId: string;
        responseId: string;
        overrideAddress: string;
    };
    setInternal: {
        [formId: string]: InternalSettings;
    };
    setSecrets: {
        [formId: string]: ApplicationFormSecrets;
    };
    refreshResponses: {
        formId: string;
        force?: boolean;
    };
    renderEmailTemplate: {
        formId: string;
        responseId: string;
    };
};

export type Responses = {
    getControls: gapi.client.forms.Item[];
    /** AppSecrets.remoteEventSettings value */
    getSettings: string;
    getInternal: {
        secretsExist: boolean;
    } & InternalSettings;
    refreshResponses: {
        new: number;
        changed: number;
    };
    renderEmailTemplate: {
        result: string;
        variables: EmailTemplateVars,
    };
    sendRespondentEmail: void;
    /** Returns email adresses */
    sendPendingEmails: string[];
    setSecrets: void;
    setInternal: void;
};

export type ApiResponse<T> = {
    ok: boolean;
    error?: {
        code: string;
        http: number;
        message: string;
        stack?: string;
    };
    data?: T;
};

export type InternalSettings = {
    canEditResponse: boolean;
};

export function doGet(e: GoogleAppsScript.Events.DoGet) {
    try {
        if (!e.pathInfo) {
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message:
                        "Request must be targeted to /action/ and have query string parameter body=jsonFormattedBody",
                },
            });
        }
        const body =
            typeof e.parameter.body == "string" ? JSON.parse(e.parameter.body) : null;
        if (!body) {
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message:
                        "Request must have query string parameter body=jsonFormattedBody",
                },
            });
        }

        return processRequest(e.pathInfo as Action, body);
    } catch (e) {
        console.error(e);
        return createResonse({
            ok: false,
            error: {
                code: "Internal Server Error",
                http: 500,
                message:
                    typeof e == "object"
                        ? e && "message" in e
                            ? e.message
                            : e
                        : (e as any),
                stack:
                    typeof e == "object"
                        ? e && "stack" in e
                            ? (e.stack as any)
                            : undefined
                        : undefined,
            },
        });
    }
}

export function doPost(e: GoogleAppsScript.Events.DoPost) {
    if (e.postData.type != "text/plain") {
        return createResonse({
            ok: false,
            error: {
                code: "Unsupported Media Type",
                http: 415,
                message: "Only content type text/plain is supported",
            },
        });
    }
    try {
        const postData: {
            action: Action;
            body: any;
        } = JSON.parse(e.postData.contents);
        return processRequest(postData.action, postData.body);
    } catch (e) {
        console.error(e);
        return createResonse({
            ok: false,
            error: {
                code: "Internal Server Error",
                http: 500,
                message:
                    typeof e == "object"
                        ? e && "message" in e
                            ? e.message
                            : e
                        : (e as any),
                stack:
                    typeof e == "object"
                        ? e && "stack" in e
                            ? (e.stack as any)
                            : undefined
                        : undefined,
            },
        });
    }
}

function processRequest(action: Action, body: any) {
    if (
        typeof action != "string" ||
        !action ||
        typeof body != "object" ||
        !body
    ) {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message: "Body must be formatted as {action: string, body: ...}",
            },
        });
    }

    switch (action) {
        case "setSecrets":
            return _setSecrets(body);
        case "getSettings":
            return _getSecrets(body);
        case "getInternal":
            return _getInternal(body);
        case "setInternal":
            return _setInternal(body);
        case "refreshResponses":
            return _refreshResponses(body);
        case 'renderEmailTemplate':
            return _renderEmailTemplate(body);
        case "sendPendingEmails":
            return _sendPendingEmails(body);
        case "sendRespondentEmail":
            return _sendRespondentEmail(body);
        default:
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message: "Unknown action " + action,
                },
            });
    }
}

function createResonse<T>(response: ApiResponse<T>) {
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
        ContentService.MimeType.JSON
    );
}

function navigationTypeToAction(
    navigationType: GoogleAppsScript.Forms.PageNavigationType
): gapi.client.forms.Option["goToAction"] | undefined {
    switch (navigationType) {
        case FormApp.PageNavigationType.SUBMIT:
            return "SUBMIT_FORM";
        case FormApp.PageNavigationType.GO_TO_PAGE:
            return "NEXT_SECTION";
        case FormApp.PageNavigationType.CONTINUE:
            return "GO_TO_ACTION_UNSPECIFIED";
        case FormApp.PageNavigationType.RESTART:
            return "RESTART_FORM";
    }
}

function convertAlignment(
    from: GoogleAppsScript.Forms.Alignment
): gapi.client.forms.MediaProperties["alignment"] {
    if (from)
        switch (from) {
            case FormApp.Alignment.LEFT:
                return "LEFT";
            case FormApp.Alignment.CENTER:
                return "CENTER";
            case FormApp.Alignment.RIGHT:
                return "RIGHT";
        }
    return "ALIGNMENT_UNSPECIFIED";
}
function _getControls(body: Record<string, string>) {
    if (typeof body.formId == "string" && body.formId) {
        const form = FormApp.openById(body.formId);

        const items = form.getItems();
        const controls = items.map((item, i) => {
            const control: gapi.client.forms.Item &
                Record<string, string | number | undefined> = {
                itemId: item.getId().toString(16),
                index: item.getIndex(),
                type: item.getType(),
                description: item.getHelpText(),
            };
            switch (item.getType()) {
                case FormApp.ItemType.CHECKBOX:
                    const CheckboxItem = item.asCheckboxItem();
                    control.questionItem = {
                        question: {
                            questionId: CheckboxItem.getId().toString(16),
                            choiceQuestion: {
                                options: (
                                    CheckboxItem.getChoices().map((c) => ({
                                        goToAction: navigationTypeToAction(
                                            c.getPageNavigationType()
                                        ),
                                        goToSectionId: c.getGotoPage().getId().toString(16),
                                        value: c.getValue(),
                                    })) as gapi.client.forms.Option[]
                                ).concat(
                                    ...(CheckboxItem.hasOtherOption()
                                        ? [
                                            {
                                                isOther: true,
                                            },
                                        ]
                                        : [])
                                ),
                                type: "CHECKBOX",
                            },
                            required: CheckboxItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.CHECKBOX_GRID:
                    const CheckboxGridItem = item.asCheckboxGridItem();
                    control.questionGroupItem = {
                        grid: {
                            columns: {
                                options: CheckboxGridItem.getColumns().map((c) => ({
                                    value: c,
                                })),
                                type: "CHECKBOX",
                            },
                        },
                        questions: CheckboxGridItem.getRows().map((r) => ({
                            rowQuestion: {
                                //TODO missing questionId and probably no way to get it
                                title: r,
                            },
                        })),
                    };
                    control.questionItem = {
                        question: {
                            questionId: CheckboxGridItem.getId().toString(16),
                            required: CheckboxGridItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.DATE:
                    const DateItem = item.asDateItem();
                    control.questionItem = {
                        question: {
                            questionId: DateItem.getId().toString(16),
                            dateQuestion: {
                                includeTime: false,
                                includeYear: DateItem.includesYear(),
                            },
                            required: DateItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.DATETIME:
                    const DateTimeItem = item.asDateTimeItem();
                    control.questionItem = {
                        question: {
                            questionId: DateTimeItem.getId().toString(16),
                            dateQuestion: {
                                includeTime: true,
                                includeYear: DateTimeItem.includesYear(),
                            },
                            required: DateTimeItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.LIST:
                    const ListItem = item.asListItem();
                    control.questionItem = {
                        question: {
                            questionId: ListItem.getId().toString(16),
                            choiceQuestion: {
                                options: ListItem.getChoices().map((c) => ({
                                    goToAction: navigationTypeToAction(c.getPageNavigationType()),
                                    goToSectionId: c.getGotoPage().getId().toString(16),
                                    value: c.getValue(),
                                })),
                                type: "DROP_DOWN",
                            },
                            required: ListItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.MULTIPLE_CHOICE:
                    const MultipleChoiceItem = item.asMultipleChoiceItem();
                    control.questionItem = {
                        question: {
                            questionId: MultipleChoiceItem.getId().toString(16),
                            choiceQuestion: {
                                options: (
                                    MultipleChoiceItem.getChoices().map((c) => ({
                                        goToAction: navigationTypeToAction(
                                            c.getPageNavigationType()
                                        ),
                                        goToSectionId: c.getGotoPage().getId().toString(16),
                                        value: c.getValue(),
                                    })) as gapi.client.forms.Option[]
                                ).concat(
                                    ...(MultipleChoiceItem.hasOtherOption()
                                        ? [
                                            {
                                                isOther: true,
                                            },
                                        ]
                                        : [])
                                ),
                                type: "CHECKBOX",
                            },
                            required: MultipleChoiceItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.DURATION:
                    const DurationItem = item.asDurationItem();
                    control.questionItem = {
                        question: {
                            questionId: DurationItem.getId().toString(16),
                            timeQuestion: {
                                duration: true,
                            },
                            required: DurationItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.PARAGRAPH_TEXT:
                    const ParagraphTextItem = item.asParagraphTextItem();
                    control.questionItem = {
                        question: {
                            questionId: ParagraphTextItem.getId().toString(16),
                            textQuestion: {
                                paragraph: true,
                            },
                            required: ParagraphTextItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.SCALE:
                    const ScaleItem = item.asScaleItem();
                    control.questionItem = {
                        question: {
                            questionId: ScaleItem.getId().toString(16),
                            scaleQuestion: {
                                high: ScaleItem.getUpperBound(),
                                highLabel: ScaleItem.getRightLabel(),
                                low: ScaleItem.getLowerBound(),
                                lowLabel: ScaleItem.getLeftLabel(),
                            },
                            required: ScaleItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.SECTION_HEADER:
                    control.textItem = {};
                    break;
                case FormApp.ItemType.TEXT:
                    const TextItem = item.asTextItem();
                    control.questionItem = {
                        question: {
                            questionId: TextItem.getId().toString(),
                            textQuestion: {
                                paragraph: false,
                            },
                            required: TextItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.TIME:
                    const TimeItem = item.asTimeItem();
                    control.questionItem = {
                        question: {
                            questionId: TimeItem.getId().toString(16),
                            timeQuestion: {
                                duration: false,
                            },
                            required: TimeItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.GRID:
                    const GridItem = item.asGridItem();
                    control.questionGroupItem = {
                        grid: {
                            columns: {
                                options: GridItem.getColumns().map((c) => ({
                                    value: c,
                                })),
                                type: "RADIO",
                            },
                        },
                        questions: GridItem.getRows().map((r) => ({
                            rowQuestion: {
                                //TODO missing questionId and probably no way to get it
                                title: r,
                            },
                        })),
                    };
                    control.questionItem = {
                        question: {
                            questionId: GridItem.getId().toString(16),
                            required: GridItem.isRequired(),
                        },
                    };
                    break;
                case FormApp.ItemType.IMAGE:
                    const ImageItem = item.asImageItem();
                    const Image = ImageItem.getImage();

                    control.imageItem = {
                        image: {
                            altText: ImageItem.getHelpText(),
                            contentUri: Image.getDataAsString(),
                            properties: {
                                alignment: convertAlignment(ImageItem.getAlignment()),
                                width: ImageItem.getWidth(),
                            },
                        },
                    };
                    break;
                case FormApp.ItemType.VIDEO:
                    const VideoItem = item.asVideoItem();
                    control.videoItem = {
                        caption: VideoItem.getHelpText(),
                        // TODO no way to get video URL in GAS?
                    };
                    break;
                case FormApp.ItemType.PAGE_BREAK:
                    control.pageBreakItem = {};
                    // TODO what API has gapi for automatic page 'go to' actions?
                    break;
                default:
                    return control;
            }
            return control;
        });

        return createResonse<Responses["getControls"]>({
            ok: true,
            data: controls,
        });
    } else {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message: "Action body must be formatted as {formId: string}",
            },
        });
    }
}

function _getInternal(body: Record<string, string>) {
    if (typeof body.formId == "string" && body.formId) {
        const form = FormApp.openById(body.formId);
        let fsOrError;
        try {
            fsOrError = useFirestore(body.formId);
        } catch (e) {
            if (e instanceof Error) {
                fsOrError = e.message;
                console.log(e.message);
            }
        }
        return createResonse<Responses["getInternal"]>({
            ok: true,
            data: {
                secretsExist: typeof fsOrError != "string",
                canEditResponse: form.canEditResponse(),
            },
        });
    } else {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message: "Action body must be formatted as {formId: string}",
            },
        });
    }
}

function _getSecrets(body: Record<string, string>) {
    if (typeof body.formId == "string" && body.formId) {
        const fs = useFirestore(body.formId);
        const settings = getSecrets(body.formId);
        if (!settings.remoteEventSettings) {
            return createResonse({
                ok: false,
                error: {
                    code: "Not Found",
                    http: 404,
                    message: "No settings found for the provided formId",
                },
            });
        }

        const remoteSettings = fs.getDocument(settings.remoteEventSettings).obj;
        return createResonse({
            ok: true,
            data: remoteSettings,
        });
    } else {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message: "Action body must be formatted as {formId: string}",
            },
        });
    }
}

function _refreshResponses(body: Record<string, string | boolean>) {
    if (typeof body.formId == "string" && body.formId) {
        const form = FormApp.openById(body.formId);
        let fsOrError;
        try {
            fsOrError = useFirestore(body.formId);
        } catch (e) {
            if (e instanceof Error) {
                fsOrError = e.message;
                console.log(e.message);
            }
        }
        return createResonse<Responses["refreshResponses"]>({
            ok: true,
            data: refreshResponses(
                form,
                typeof body.force == "boolean" ? body.force : false
            ),
        });
    } else {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message:
                    "Action body must be formatted as {formId: string, force?: boolean}",
            },
        });
    }
}

function _renderEmailTemplate(body: Record<string, string | boolean>) {
    if (typeof body.formId == "string" && body.formId && typeof body.responseId == "string" && body.responseId) {
        const form = FormApp.openById(body.formId);
        const response = form.getResponse(body.responseId)
        if (!response) {
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message: "No response found for the provided responseId",
                },
            });
        }
        const fs = useFirestore(body.formId);
        const settings = getEventSettings(form, fs)
        const result = resolveEmailContent(settings, form, response, false, true)
        return createResonse<Responses["renderEmailTemplate"]>({
            ok: true,
            data: {
                result: result.htmlBody,
                variables: result.templateVars
            }
        });
    } else {
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message:
                    "Action body must be formatted as {formId: string, responseId: string}",
            },
        });
    }
}

function _sendPendingEmails(body: Actions["sendPendingEmails"]) {
    if (typeof body.formId != "string") {
        console.warn("Unexpected body: ", body);
        return createResonse({
            ok: false,
            error: {
                code: "Bad Request",
                http: 400,
                message: "Action body must be formatted as {formId: string}",
            },
        });
    }
    const form = FormApp.openById(body.formId);
    const fs = useFirestore(body.formId);
    const settings = getEventSettings(form, fs);
    if (!settings.responsesCollection) {
        throw Error("Responses collection not set for " + body.formId);
    }
    const documents = fs.getDocuments(
        settings.responsesCollection,
        Array.isArray(body.responseIds) ? body.responseIds : undefined
    );
    for (const doc of documents) {
        const record = doc.obj as ResponseRecord;
    }
}

function _sendRespondentEmail(body: Actions["sendRespondentEmail"]) { }

function _setInternal(body: Record<string, InternalSettings>) {
    for (const key in body) {
        const formSettings = body[key]!;
        if (
            "canEditResponse" in formSettings &&
            typeof formSettings.canEditResponse == "boolean"
        ) {
            const form = FormApp.openById(key);
            form.setAllowResponseEdits(formSettings.canEditResponse);

            return createResonse({ ok: true });
        } else {
            console.warn("Unexpected body: ", body);
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message:
                        "Action body must be formatted as {[formId]: {canEditResponse: boolean}}",
                },
            });
        }
    }
}

function _setSecrets(body: Record<string, ApplicationFormSecrets>) {
    for (const key in body) {
        // TODO support multiple forms
        const secrets = body[key]!;
        if (
            "email" in secrets &&
            typeof secrets.email == "string" &&
            typeof secrets.key == "string" &&
            typeof secrets.projectId == "string" &&
            typeof secrets.remoteEventSettings == "string"
        ) {
            PropertiesService.getScriptProperties().setProperty(
                key,
                JSON.stringify(secrets)
            );

            const fs = useFirestore(key, secrets);
            const remoteSettings = fs.getDocument(secrets.remoteEventSettings);
            const ok = !!remoteSettings;
            return createResonse({ ok });
        } else {
            console.warn("Unexpected body: ", body);
            return createResonse({
                ok: false,
                error: {
                    code: "Bad Request",
                    http: 400,
                    message:
                        "Action body must be formatted as {[formId]: {email: string, key: string, projectId: string, remoteEventSettings: string}}",
                },
            });
        }
    }
}
