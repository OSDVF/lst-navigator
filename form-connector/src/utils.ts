export function syncPromise<T>(promise: Promise<T>, timeout: number) : T {
    let isResolved = false
    let result: T
    let error: any

    promise.then(res => {
        isResolved = true
        result = res
    }).catch(err => {
        isResolved = true
        error = err
    })

    const start = Date.now()
    while (!isResolved) {
        if (Date.now() - start > timeout) {
            throw new Error('Timeout')
        }
        Utilities.sleep(100)
    }

    if (error) {
        throw error
    }
    return result!
}