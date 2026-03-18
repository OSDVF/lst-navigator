import type { Auth } from 'firebase/auth'

declare type IdToken = string;

export declare interface IdTokenResponse {
    localId: string;
    idToken?: IdToken;
    refreshToken?: string;
    expiresIn?: string;
    providerId?: string;
    displayName?: string | null;
    isNewUser?: boolean;
    kind?: IdTokenResponseKind;
    photoUrl?: string | null;
    rawUserInfo?: string;
    screenName?: string | null;
}

declare const enum IdTokenResponseKind {
    CreateAuthUri = 'identitytoolkit#CreateAuthUriResponse',
    DeleteAccount = 'identitytoolkit#DeleteAccountResponse',
    DownloadAccount = 'identitytoolkit#DownloadAccountResponse',
    EmailLinkSignin = 'identitytoolkit#EmailLinkSigninResponse',
    GetAccountInfo = 'identitytoolkit#GetAccountInfoResponse',
    GetOobConfirmationCode = 'identitytoolkit#GetOobConfirmationCodeResponse',
    GetRecaptchaParam = 'identitytoolkit#GetRecaptchaParamResponse',
    ResetPassword = 'identitytoolkit#ResetPasswordResponse',
    SetAccountInfo = 'identitytoolkit#SetAccountInfoResponse',
    SignupNewUser = 'identitytoolkit#SignupNewUserResponse',
    UploadAccount = 'identitytoolkit#UploadAccountResponse',
    VerifyAssertion = 'identitytoolkit#VerifyAssertionResponse',
    VerifyCustomToken = 'identitytoolkit#VerifyCustomTokenResponse',
    VerifyPassword = 'identitytoolkit#VerifyPasswordResponse'
}

export declare class StsTokenManager {
    refreshToken: string | null
    accessToken: string | null
    expirationTime: number | null
    get isExpired(): boolean;
    updateFromServerResponse(response: IdTokenResponse | FinalizeMfaResponse): void;
    updateFromIdToken(idToken: string): void;
    getToken(auth: Auth, forceRefresh?: boolean): Promise<string | null>;
    clearRefreshToken(): void;
    private refresh
    private updateTokensAndExpiration
    static fromJSON(appName: string, object: PersistedBlob): StsTokenManager;
    toJSON(): object;
    _assign(stsTokenManager: StsTokenManager): void;
    _clone(): StsTokenManager;
    _performRefresh(): never;
}

declare interface FinalizeMfaResponse {
    idToken: string;
    refreshToken: string;
}

declare type PersistedBlob = Record<string, unknown>