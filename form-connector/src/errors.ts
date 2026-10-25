export class ApiError extends Error {
    code: number
    override name = "API Error"
    constructor(message?: string, code?: number, options?: ErrorOptions) {
        super(message ?? "API Error", options)
        this.code = code ?? 500
    }

}
export class SecretsError extends ApiError {
    static code = 403 as const // forbidden
    override name = "Secrets Error"
    constructor(message?: string, options?: ErrorOptions) {
        super(message ?? "Secrets Error", SecretsError.code, options)
    }
}
