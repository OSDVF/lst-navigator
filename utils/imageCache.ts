import localforage from 'localforage'
const config = useRuntimeConfig()

export async function getCacheImage(name: string, url: string | null | undefined, cacheFirst = config.public.imageCacheFirst) {
    if (cacheFirst) {
        const blob = await localforage.getItem<Blob>(name)
        if (blob) {
            return URL.createObjectURL(blob)
        }
    }
    if (url) {
        return url
    } else {
        const blob = await localforage.getItem<Blob>(name)
        if (blob) {
            return URL.createObjectURL(blob)
        }
        return url
    }
}

function getBlobFromImage(img: HTMLImageElement): Promise<Blob | null> {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    const ctx = canvas.getContext('2d')
    ctx?.drawImage(img, 0, 0)

    return new Promise(resolve => canvas.toBlob((blob) => {
        resolve(blob)
    }))
}

export async function saveCacheImage(name: string, event: Event) {
    const image = event.target as HTMLImageElement
    const blob = await getBlobFromImage(image)
    return await localforage.setItem(name, blob)
}
