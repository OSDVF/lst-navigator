import fs from 'fs'
import path from 'path'
const nuxtOutput = '.output/public/_nuxt'
const d = fs.readdirSync(nuxtOutput)
for (const f of d) {
    if (f.endsWith('.js')) {
        fs.appendFileSync(`${nuxtOutput}/${f}`, `//# sourceMappingURL=${path.basename(f)}.map\n`)
    }
}
