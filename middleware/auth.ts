// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
    const user = await getCurrentUser()
    // redirect the user to the login page
    if (import.meta.client && !user) {
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath,
            },
        })
    }
})
