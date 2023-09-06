export function tryCatch<T extends Array<any>, U>(f: (...cons: [...T]) => U, ...cons: [...T]): U | undefined

export function tryCatch<T extends Array<any>, U, V>(f: (...cons: [...T]) => U, catchFunc?: (ex: any) => V, ...cons: [...T]): U | V | undefined {
    try {
        return f(...cons)
    } catch (e) {
        return catchFunc?.(e)
    }
}
