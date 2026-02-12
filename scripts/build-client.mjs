import * as esbuild from 'esbuild'
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import packJSON from "../package.json" with { type: "json"};

const version = packJSON.version
const now = new Date()
const gitSha = (() => {
  try {
    const head = readFileSync('.git/HEAD', 'utf8').trim()
    if (!head.startsWith('ref: ')) return head.slice(0, 7)
    const ref = head.slice(5)
    const refPath = `.git/${ref}`
    if (existsSync(refPath)) return readFileSync(refPath, 'utf8').trim().slice(0, 7)
    const packedRefs = '.git/packed-refs'
    if (existsSync(packedRefs)) {
      const lines = readFileSync(packedRefs, 'utf8').split('\n')
      for (const line of lines) {
        if (line.startsWith('#') || line.startsWith('^') || !line.trim()) continue
        const [sha, name] = line.trim().split(' ')
        if (name === ref) return sha.slice(0, 7)
      }
    }
  } catch {
    return 'unknown'
  }
  return 'unknown'
})()
const stampedVersion = `${version}-dev+${gitSha}`

let results = await esbuild.build({
  entryPoints: ['client.js'],
  bundle: true,
  banner: {
    js: `/* wiki-client - ${stampedVersion} - ${now.toUTCString()} */`},
  minify: true,
  sourcemap: true,
  logLevel: 'info',
  metafile: true,
  outfile: 'client/client.js'
})

await fs.writeFile('meta-client.json', JSON.stringify(results.metafile))
console.log('\n  esbuild metadata written to \'meta-client.json\'.')
