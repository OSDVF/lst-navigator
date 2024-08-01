import fs from 'fs'
import path from "path"

export default function mirrorAuth(base: string) {
    const files = [
        'auth/handler',
        'auth/handler.js',
        'auth/experiments.js',
        'auth/iframe',
        'auth/iframe.js',
        'firebase/init.json',
    ]

    for (const file of files) {
        fetch(`https://${base}/__/${file}`, {
            signal: AbortSignal.timeout(60000),// one minute timeout
        }).then((response) => {
            return response.text()
        }).then((content) => {
            console.log(`Fetched ${file}`)
            fs.mkdirSync(path.resolve(__dirname, '../public/__/', path.dirname(file)), { recursive: true })
            fs.writeFileSync(path.resolve(__dirname, '../public/__/', file), content, { encoding: 'utf8', flag: 'w' })
        })
    }
}

// If ran from command line, use the first argument as the base URL
if (process.argv[1].endsWith('mirrorAuth.ts')) {
    const base = process.argv[2]
    if (base)
        mirrorAuth(base)
    else console.error('Enter base domain as an argument')
}