// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
    const config = useRuntimeConfig()
    const user = await getCurrentUser()
    // redirect the user to the login page
    if (import.meta.client && !user && !config.public.debugUser) {
        return navigateTo({
            path: '/login',
            query: {
                redirect: to.fullPath,
            },
        })
    }
})
