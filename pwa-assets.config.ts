import {
    defineConfig,
    minimal2023Preset,
    combinePresetAndAppleSplashScreens,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
    headLinkOptions: {
        preset: '2023',
    },
    preset: combinePresetAndAppleSplashScreens(minimal2023Preset, {
        darkResizeOptions: {
            background: '#1e1e33ff',
        },
        name: (landscape, size, dark) => {
            return `apple-splash-${landscape ? 'landscape' : 'portrait'}-${typeof dark === 'boolean' ? (dark ? 'dark-' : '') : ''}${size.width}x${size.height}.png`
        },
    }),
    images: ['public/favicon.svg'],
})