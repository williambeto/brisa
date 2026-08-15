import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const packageRoot = new URL('../', import.meta.url)

async function rootTarballs() {
  return (await readdir(packageRoot)).filter((name) => name.endsWith('.tgz')).sort()
}

test('o pacote contém somente a distribuição deliberada', async () => {
  const tarballsBefore = await rootTarballs()
  assert.deepEqual(tarballsBefore, [], 'a raiz deve começar sem arquivos .tgz')

  const packed = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: packageRoot, encoding: 'utf8' },
  )

  assert.equal(packed.status, 0, packed.stderr || packed.stdout)
  const [manifest] = JSON.parse(packed.stdout)
  assert.ok(manifest, 'npm pack deve retornar um manifesto')

  const rootFiles = await readdir(packageRoot)
  const metadata = new Set(
    rootFiles.filter((name) =>
      name === 'package.json' || /^(?:readme|licen[cs]e)(?:\..+)?$/i.test(name),
    ),
  )
  const files = manifest.files.map(({ path, size }) => ({ path, size }))

  assert.ok(files.some(({ path }) => path === 'dist/index.html'), 'dist/index.html é obrigatório')
  assert.ok(
    files.some(({ path }) => /^dist\/assets\/.+\.js$/.test(path)),
    'ao menos um bundle JavaScript é obrigatório',
  )

  for (const file of files) {
    assert.ok(file.size > 0, `${file.path} não pode estar vazio`)
    assert.ok(!file.path.endsWith('.map'), `source map não deliberado: ${file.path}`)
    assert.ok(
      metadata.has(file.path) || file.path.startsWith('dist/'),
      `arquivo fora da allowlist: ${file.path}`,
    )
  }

  assert.deepEqual(await rootTarballs(), tarballsBefore, 'npm pack --dry-run não deve criar .tgz')
})
