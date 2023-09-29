import fs from 'fs'
import path from 'path'
const d = fs.readdirSync('.output/public/_nuxt')
for (const f of d) {
    if (f.endsWith('.js')) {
        fs.appendFileSync(`.output/public/_nuxt/${f}`, `//# sourceMappingURL=${path.basename(f)}.map\n`)
    }
}
