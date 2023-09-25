import childProcess from 'child_process'
import { stderr, stdin, stdout, argv, env } from 'process'
import { chunksToLinesAsync } from '@rauschma/stringio'

const p = childProcess.spawn('./node_modules/.bin/nuxt', ['generate'], { shell: true, env: { ...env, FORCE_COLOR: 'true', CI: env.CI || argv.includes('ci') } })

checkReadable(p.stdout)
p.stdout.pipe(stdout)
p.stdin.pipe(stdin)
p.stderr.pipe(stderr)

async function checkReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) {
        if (line.includes('You can now deploy')) {
            p.kill()
            return
            // Kill when complete
            // This is neccecary because the process will not exit on its own for some reason
        }
    }
}
