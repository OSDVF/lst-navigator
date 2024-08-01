import type { Api as DTApi, ApiRowsMethods } from 'datatables.net'
export type Api<T> = DTApi<T> & {
    rows(selector?: any): ApiRowsMethods<T>
}