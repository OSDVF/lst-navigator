import { type StorageReference, ref as storageRef, listAll } from 'firebase/storage'

export type FileTree = {
    directory?: {
        [key: string]: FileTree | undefined
    },
    file?: StorageReference
}


const fileTree = ref<FileTree>({ directory: {} })

const DIRECTORY_SEPARATOR = '/'

function addFileToTree(file: StorageReference, isDir: boolean) { // Register a file or a directory with all its parent directories
    const parts = file.fullPath.split(DIRECTORY_SEPARATOR)
    let dfsDir = fileTree.value
    for (const i in parts) {
        const part = parts[i]
        const iInt = parseInt(i)
        if (dfsDir.directory) {
            const existingFiOrDir = dfsDir.directory[part]
            if (typeof existingFiOrDir !== 'undefined') {
                if (iInt === parts.length - 1 && !isDir) {
                    if (existingFiOrDir.file) {
                        console.log(`File updated with ${file.fullPath}`)
                    } else {
                        throw new Error(`Cannot change directory to a file at ${part} for ${file.fullPath}`)
                    }
                } else if (existingFiOrDir.file) {
                    throw new Error(`Cannot change file ${part} to directory for ${file.fullPath}`)
                } else {
                    dfsDir = existingFiOrDir
                }
            } else {
                const newEntry = (iInt === parts.length - 1) && !isDir ? { file } : { directory: {} }
                dfsDir.directory![part] = newEntry
                dfsDir = newEntry
            }
        } else if (iInt === parts.length - 1 && !isDir) {
            console.log(`File ${part} already exists for ${file.fullPath}`)
            dfsDir.file = file
        } else {
            throw new Error(`Cannot traverse ${part} for ${file.fullPath}`)
        }
    }
}

function getFromTree(path?: string): FileTree | undefined {
    if (!path) {
        return fileTree.value
    }
    const parts = path.split(DIRECTORY_SEPARATOR)
    let dfsTarget = fileTree.value
    const foundFile = false
    for (const i in parts) {
        const p = parts[i]
        if (foundFile) {
            throw new Error(`${dfsTarget.file?.fullPath} is not a directory`)
        }
        const next = dfsTarget.directory?.[p]
        if (!next) {
            return undefined
        }
        if (parseInt(i) === parts.length - 1) {
            return next
        } else if (!next.directory) {
            throw new Error(`File ${p} is not a directory for ${path}`)
        }
        dfsTarget = next
    }
}

export default function useFileTree(file: MaybeRefOrGetter<string | undefined>): Ref<FileTree | undefined> {
    const config = useRuntimeConfig()
    if (!config.public.storageEnabled) {
        return ref(undefined)
    }
    const storage = useFirebaseStorage()
    const fileV = toValue(file)
    let f: StorageReference | null = storageRef(storage, fileV)
    const update = async () => {
        if (fileV && f && storage) {
            do {
                if (f.fullPath && getFromTree(f.fullPath)?.file) {
                    f = f.parent
                    continue
                }
                const items = (await listAll(f))
                console.log(items)
                for (const item of items.items) {
                    addFileToTree(item, false)
                }
                for (const item of items.prefixes) {
                    addFileToTree(item, true)
                }
                f = f.parent
            } while (f !== null)
        }
    }
    update()
    return fileTree
}
