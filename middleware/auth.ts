import { getCurrentUser } from 'vuefire'

// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
    const config = useRuntimeConfig()
    if (import.meta.client) {
        const user = await getCurrentUser()
        // redirect the user to the login page
        if (!user && !config.public.debugUser) {
            return navigateTo({
                path: '/login',
                query: {
                    redirect: to.fullPath,
                },
            })
        }
    }
})
