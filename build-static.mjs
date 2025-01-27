import childProcess from 'child_process'
import { stderr, stdin, stdout, argv, env, exit } from 'process'
import { chunksToLinesAsync } from '@rauschma/stringio'

const p = childProcess.spawn('./node_modules/.bin/nuxt', ['generate', ...process.argv.slice(2).filter(p => p != 'ci')], { shell: true, env: { ...env, FORCE_COLOR: 'true', CI: env.CI || argv.includes('ci') } })

checkReadable(p.stdout)
stdin.pipe(p.stdin)
p.stderr.pipe(stderr)

async function checkReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) {
        if (line.includes('You can now deploy') || line.includes('You can preview this build using')) {
            p.kill()
            exit(0)
            // Kill when complete
            // This is neccecary because the process will not exit on its own for some reason
        } else if (line.includes('Exiting due to prerender errors')) {
            exit(1)
        } else {
            stdout.write(line)
        }
    }
}

p.on('close', (code) => {
    exit(code)
})