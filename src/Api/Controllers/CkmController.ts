import { Hono } from 'hono'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const CKM_REPO_URL = process.env['CKM_MIRROR_REPO'] ?? 'https://github.com/franselstadt/CKM-mirror.git'
const CKM_ROOT = resolve(process.cwd(), process.env['CKM_MIRROR_PATH'] ?? 'external/CKM-mirror')

type Scope = 'local' | 'remote'

function parseScope(value: string | undefined): Scope {
  return value === 'local' ? 'local' : 'remote'
}

function resolveScopePath(scope: Scope, relativePath = ''): string {
  const scopedBase = resolve(join(CKM_ROOT, scope))
  const base = existsSync(scopedBase) ? scopedBase : CKM_ROOT
  const target = resolve(join(base, relativePath))
  if (!target.startsWith(base)) {
    throw new Error('Invalid path')
  }
  return target
}

async function syncMirror(): Promise<void> {
  await mkdir(resolve(join(CKM_ROOT, '..')), { recursive: true })
  if (!existsSync(join(CKM_ROOT, '.git'))) {
    await execFileAsync('git', ['clone', '--depth', '1', CKM_REPO_URL, CKM_ROOT])
    return
  }
  await execFileAsync('git', ['-C', CKM_ROOT, 'pull', '--ff-only'])
}

const CKM_DEMO_FILES: Array<{ path: string; content: string }> = [
  {
    path: 'local/archetypes/openEHR-EHR-OBSERVATION.body_temperature.v2.adl',
    content: [
      'archetype (adl_version=2.0.6; uid=demo-body-temp-v2)',
      'openEHR-EHR-OBSERVATION.body_temperature.v2',
      '',
      'language',
      '  original_language = <[ISO_639-1::en]>',
      '',
      'description',
      '  original_author = <',
      '    ["name"] = <"BunEHR Demo Seed">',
      '  >',
      '',
      'definition',
      '  OBSERVATION[at0000] matches {',
      '    data matches {',
      '      HISTORY[at0001] matches {',
      '        events cardinality matches {0..*; unordered} matches {',
      '          POINT_EVENT[at0002] occurrences matches {0..*} matches {',
      '            data matches {',
      '              ITEM_TREE[at0003] matches {',
      '                items cardinality matches {1..*; unordered} matches {',
      '                  ELEMENT[at0004] occurrences matches {0..1} matches {*}',
      '                }',
      '              }',
      '            }',
      '          }',
      '        }',
      '      }',
      '    }',
      '  }',
      '',
    ].join('\n'),
  },
  {
    path: 'local/templates/BunEHR-Vitals-Demo.oet',
    content: [
      '<template id="BunEHR-Vitals-Demo">',
      '  <name language="en">BunEHR Vitals Demo Template</name>',
      '  <description language="en">Demo template seeded for CKM browsing</description>',
      '  <components>',
      '    <archetype id="openEHR-EHR-OBSERVATION.body_temperature.v2" />',
      '  </components>',
      '</template>',
      '',
    ].join('\n'),
  },
  {
    path: 'remote/mirror-notes/README.md',
    content: [
      '# CKM Mirror Demo Content',
      '',
      'This file is seeded by BunEHR to provide offline/demo CKM browsing content.',
      '',
      '- Scope: `remote`',
      '- Purpose: verify tree/file APIs without external network dependency',
      '',
    ].join('\n'),
  },
]

async function seedDemoMirrorData(): Promise<number> {
  let written = 0
  for (const file of CKM_DEMO_FILES) {
    const target = resolve(join(CKM_ROOT, file.path))
    const parent = resolve(join(target, '..'))
    await mkdir(parent, { recursive: true })
    await writeFile(target, file.content, 'utf8')
    written++
  }
  return written
}

export function createCkmController() {
  const app = new Hono()

  app.get('/api/ckm/status', async (c) => {
    const exists = existsSync(CKM_ROOT)
    const hasRepo = existsSync(join(CKM_ROOT, '.git'))
    let branch = 'unknown'
    let lastCommit = 'unknown'
    let error: string | null = null

    if (hasRepo) {
      try {
        const branchOut = await execFileAsync('git', ['-C', CKM_ROOT, 'rev-parse', '--abbrev-ref', 'HEAD'])
        const commitOut = await execFileAsync('git', ['-C', CKM_ROOT, 'log', '-1', '--pretty=format:%h %s'])
        branch = branchOut.stdout.trim()
        lastCommit = commitOut.stdout.trim()
      } catch (e) {
        error = e instanceof Error ? e.message : 'failed to read git metadata'
      }
    }

    return c.json({
      rootPath: CKM_ROOT,
      repository: CKM_REPO_URL,
      exists,
      hasRepo,
      branch,
      lastCommit,
      error,
    })
  })

  app.post('/api/ckm/sync', async (c) => {
    try {
      await syncMirror()
      const commitOut = await execFileAsync('git', ['-C', CKM_ROOT, 'log', '-1', '--pretty=format:%h %s'])
      return c.json({
        ok: true,
        rootPath: CKM_ROOT,
        repository: CKM_REPO_URL,
        lastCommit: commitOut.stdout.trim(),
      })
    } catch (e) {
      return c.json({
        ok: false,
        detail: e instanceof Error ? e.message : 'CKM sync failed',
      }, 500)
    }
  })

  app.post('/api/ckm/seed-demo', async (c) => {
    try {
      await mkdir(CKM_ROOT, { recursive: true })
      const filesWritten = await seedDemoMirrorData()
      return c.json({
        ok: true,
        rootPath: CKM_ROOT,
        filesWritten,
        message: 'CKM demo data seeded.',
      })
    } catch (e) {
      return c.json({
        ok: false,
        detail: e instanceof Error ? e.message : 'CKM demo seed failed',
      }, 500)
    }
  })

  app.get('/api/ckm/tree', async (c) => {
    try {
      if (!existsSync(join(CKM_ROOT, '.git'))) {
        await syncMirror()
      }
      const scope = parseScope(c.req.query('scope'))
      const relativePath = c.req.query('path') ?? ''
      const dir = resolveScopePath(scope, relativePath)
      const entries = await readdir(dir, { withFileTypes: true })

      const rows = await Promise.all(entries.map(async (entry) => {
        const childPath = relativePath ? `${relativePath}/${entry.name}` : entry.name
        const absPath = resolveScopePath(scope, childPath)
        const st = await stat(absPath)
        return {
          name: entry.name,
          path: childPath,
          isDirectory: entry.isDirectory(),
          size: st.size,
          modifiedAt: st.mtime.toISOString(),
        }
      }))

      rows.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return c.json({ scope, path: relativePath, entries: rows })
    } catch (e) {
      return c.json({ detail: e instanceof Error ? e.message : 'Failed to list CKM tree' }, 400)
    }
  })

  app.get('/api/ckm/file', async (c) => {
    try {
      if (!existsSync(join(CKM_ROOT, '.git'))) {
        await syncMirror()
      }
      const scope = parseScope(c.req.query('scope'))
      const relativePath = c.req.query('path')
      if (!relativePath) return c.json({ detail: 'path is required' }, 400)
      const filePath = resolveScopePath(scope, relativePath)
      const st = await stat(filePath)
      if (st.isDirectory()) return c.json({ detail: 'path points to a directory' }, 400)

      const content = await readFile(filePath, 'utf8')
      return c.json({
        scope,
        path: relativePath,
        size: st.size,
        modifiedAt: st.mtime.toISOString(),
        content,
      })
    } catch (e) {
      return c.json({ detail: e instanceof Error ? e.message : 'Failed to read CKM file' }, 400)
    }
  })

  return app
}
