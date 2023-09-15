import childProcess from 'child_process'
import { stderr, stdin, stdout, env } from 'process'
import { chunksToLinesAsync } from '@rauschma/stringio'

const p = childProcess.spawn('nuxt', ['generate'], { shell: true, env: { ...env, FORCE_COLOR: 'true' } })

checkReadable(p.stdout)
p.stdout.pipe(stdout)
p.stdin.pipe(stdin)
p.stderr.pipe(stderr)

async function checkReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) {
        if (line.includes('You can now deploy')) {
            p.kill()
            // Kill when complete
            // This is neccecary because the process will not exit on its own for some reason
        }
    }
}
