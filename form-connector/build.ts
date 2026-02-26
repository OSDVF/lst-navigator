import * as fs from 'node:fs/promises'

const output = await Bun.build({
    entrypoints: ['src/main.ts'],
    outdir: 'dist',
    target: 'browser',
    minify: {
        whitespace: true,
        identifiers: false,
        syntax: true,
        keepNames: true,
    },
})
// keep exported functions but do not include the "export" keyword
for (const o of output.outputs) {
    const text = await o.text()
    const replaced = text.replace(/export.*;/, '')
    const file = Bun.file(o.path)
    file.write(replaced)
}

for (const f of await fs.readdir('public')) {
    fs.cp('public/' + f, 'dist/' + f)
}