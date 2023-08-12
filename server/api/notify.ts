import notify from '~/server/app/services/notify'

export default defineEventHandler(async (_event) => {
    return await notify()
})
