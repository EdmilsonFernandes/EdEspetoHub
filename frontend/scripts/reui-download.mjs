#!/usr/bin/env node
/**
 * ReUI block downloader — bypassa o shadcn CLI (que não repassa o
 * REUI_LICENSE_KEY nas versões atuais; a registry ReUI aceita Bearer direto).
 *
 * Uso (a partir de frontend/):
 *   node scripts/reui-download.mjs <bloco> [bloco2 ...] [--force] [--install]
 *
 * Fontes:
 *  - ReUI (com REUI_LICENSE_KEY de frontend/.env.local): https://reui.io/r/<n>.json
 *  - Deps plain (item, separator, tabs…) não são ReUI: caem pro oficial
 *    https://ui.shadcn.com/r/styles/new-york-v4/<n>.json
 *
 * Destinos:
 *  - blocos          → src/components/reui/<bloco>/   (demo page.tsx pulado)
 *  - ui ReUI         → src/components/reui/<arquivo>  (imports @/components/reui/…)
 *  - ui shadcn oficial → src/components/ui/<arquivo>  (imports @/components/ui/…)
 *
 * Colisão com componentes JNC (PascalCase em src/components/ui — Windows é
 * case-insensitive, escrever button.tsx SOBRESCREVE Button.tsx!):
 *  - COLLISION_POLICY 'use-jnc'  → não baixa; imports viram @/components/ui/Button
 *    (case exato, resolve no Linux do Docker). Button do JNC tem aliases shadcn.
 *  - 'relocate' (default)        → baixa em src/components/reui/shad/<n>.tsx
 *
 * Imports reescritos: from "cn" → @/lib/utils · @/registry/…/ui|lib|hooks →
 * aliases JNC · icon-placeholder de demo → stub próprio.
 * Plano de uso: .ux-audit/reui-catalog/PLANO_REUI_JNC.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FRONTEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REUI = 'https://reui.io/r'
const SHADCN = 'https://ui.shadcn.com/r/styles/new-york'
const UI_DIR = join(FRONTEND_DIR, 'src/components/ui')

/** Política por componente quando colide com um arquivo JNC existente. */
const COLLISION_POLICY = {
  button: 'use-jnc', // Button JNC tem loading/rightIcon + aliases outline/link/destructive/icon
  // default: 'relocate'
}

const CN_UTILS = `import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`

const ICON_PLACEHOLDER = `import { Box } from "lucide-react"

/** Stub dos demos ReUI (aceita as props de icon-set e ignora; trocar por
 *  ícone Phosphor real ao portar o bloco). */
export function IconPlaceholder({ className }: { className?: string } & Record<string, unknown>) {
  return <Box className={className} aria-hidden="true" />
}
`

function readLicenseKey() {
  if (process.env.REUI_LICENSE_KEY) return process.env.REUI_LICENSE_KEY
  for (const f of ['.env.local', '.env']) {
    const p = join(FRONTEND_DIR, f)
    if (!existsSync(p)) continue
    const m = readFileSync(p, 'utf8').match(/^REUI_LICENSE_KEY=(.+)$/m)
    if (m) return m[1].trim()
  }
  console.error('✗ REUI_LICENSE_KEY não achado (frontend/.env.local nem env)')
  process.exit(1)
}

async function fetchJson(url, key) {
  const res = await fetch(url, {
    headers: key ? { Authorization: `Bearer ${key}` } : {},
    redirect: 'follow',
  })
  return { res, json: res.ok ? await res.json() : null }
}

/** ReUI primeiro; 404 → registry oficial shadcn. */
async function fetchItem(key, name) {
  let { res, json } = await fetchJson(`${REUI}/${name}.json`, key)
  if (json) return { item: json, origin: 'reui' }
  if (res.status === 404) {
    ;({ json } = await fetchJson(`${SHADCN}/${name}.json`, null))
    if (json) {
      console.log(`  (${name}: item shadcn oficial, não ReUI)`)
      return { item: json, origin: 'shadcn' }
    }
  }
  throw new Error(`${name}: HTTP ${res.status} ${res.statusText} (Reui e shadcn)`)
}

/** Mapa lowercase → nome real em src/components/ui (detecção de colisão). */
function scanJncUi() {
  if (!existsSync(UI_DIR)) return {}
  const map = {}
  for (const f of readdirSync(UI_DIR)) {
    if (f.endsWith('.tsx') || f.endsWith('.ts')) map[f.toLowerCase()] = f
  }
  return map
}

// ---- pass 1: baixa metadados e monta o mapa de imports ----
const jncUi = scanJncUi()
const importAlias = {} // ex: { button: 'ui/Button', toggle: 'reui/shad/toggle' }
const items = [] // {item, origin}
const npmDeps = new Set()
const seen = new Set()
let needsIconPlaceholder = false

function planUiPlacement(name) {
  const lower = `${name.toLowerCase()}.tsx`
  if (!(jncUi[lower] && jncUi[lower] !== lower)) return { dir: 'src/components/ui', alias: null }
  const jncName = jncUi[lower].replace(/\.tsx?$/, '')
  if ((COLLISION_POLICY[name.toLowerCase()] ?? 'relocate') === 'use-jnc') {
    return { dir: null, alias: [`@/components/ui/${name}`, `@/components/ui/${jncName}`] }
  }
  return {
    dir: 'src/components/reui/shad',
    alias: [`@/components/ui/${name}`, `@/components/reui/shad/${name}`],
  }
}

async function collect(key, name, force) {
  let clean = name.replace(/^@reui\//, '')
  if (clean === 'cn') clean = 'utils'
  if (seen.has(clean)) return
  seen.add(clean)

  const { item, origin } = await fetchItem(key, clean)
  items.push({ item, origin, force })

  if (item.type === 'registry:ui' && origin === 'shadcn') {
    const plan = planUiPlacement(clean)
    if (plan.alias) {
      importAlias[clean] = plan.alias
      if (plan.dir === null) console.log(`  (${clean}: usa ${plan.alias[1]} do JNC — colisão)`)
    }
  }
  for (const dep of item.files ?? []) {
    if (dep.content?.includes('icon-placeholder')) needsIconPlaceholder = true
  }
  for (const dep of item.dependencies ?? []) {
    if (dep === 'cn') {
      npmDeps.add('clsx')
      npmDeps.add('tailwind-merge')
    } else npmDeps.add(dep)
  }
  for (const dep of item.registryDependencies ?? []) await collect(key, dep, force)
}

// ---- pass 2: escreve com o mapa completo ----
const written = []

function targetDir(item, origin, name) {
  if (item.type === 'registry:lib') return 'src/lib'
  if (item.type?.startsWith('registry:hook')) return 'src/hooks'
  if (item.type === 'registry:ui') {
    if (origin === 'reui') {
      // multi-arquivo fica em subpasta: imports usam @/components/reui/<item>/<file>
      return (item.files ?? []).length > 1 ? `src/components/reui/${name}` : 'src/components/reui'
    }
    const plan = planUiPlacement(name)
    if (!plan.dir) return null // colisão use-jnc: não escreve
    return plan.dir
  }
  return `src/components/reui/${item.name}`
}

function transform(content) {
  let out = content
    .replace(/from\s+["']cn["']/g, 'from "@/lib/utils"')
    .replace(/["']@\/registry\/[^"']*\/ui\//g, '"@/components/ui/')
    .replace(/["']@\/registry\/[^"']*\/lib\//g, '"@/lib/')
    .replace(/["']@\/registry\/[^"']*\/hooks\//g, '"@/hooks/')
  for (const [name, [from, to]] of Object.entries(importAlias)) {
    out = out.split(`@/components/ui/${name}"`).join(`${to}"`)
    out = out.split(`@/components/ui/${name}'`).join(`${to}'`)
  }
  if (out.includes('icon-placeholder')) {
    needsIconPlaceholder = true
    out = out.replace(
      /["']@\/app\/\(create\)\/components\/icon-placeholder["']/g,
      '"@/components/reui/icon-placeholder"'
    )
  }
  return out
}

function writeFiles() {
  for (const { item, origin, force } of items) {
    const name = item.name
    const dirRel = targetDir(item, origin, name)
    if (!dirRel) continue
    const dir = join(FRONTEND_DIR, dirRel)
    if (existsSync(dir) && !force && item.type !== 'registry:ui' && item.type !== 'registry:lib') {
      console.log(`↷ ${name} já existe em ${dirRel} (use --force)`)
      continue
    }
    let n = 0
    for (const f of item.files ?? []) {
      if (!f.content) continue
      if (item.type === 'registry:block' && /^page\.tsx$/.test(f.path ?? '')) continue
      const rel = (f.path ?? f.target).replace(/^.*\/(ui|lib|hooks)\//, '')
      const finalPath = join(dir, rel)
      mkdirSync(dirname(finalPath), { recursive: true })
      writeFileSync(finalPath, transform(f.content))
      written.push(finalPath.slice(FRONTEND_DIR.length + 1))
      n++
    }
    if (n) console.log(`✓ ${name} (${item.type}) → ${n} arquivo(s)`)
  }

  const utilsPath = join(FRONTEND_DIR, 'src/lib/utils.ts')
  if (npmDeps.has('clsx') && !existsSync(utilsPath)) {
    mkdirSync(dirname(utilsPath), { recursive: true })
    writeFileSync(utilsPath, CN_UTILS)
    written.push('src/lib/utils.ts')
    console.log('✓ utils (cn) escrito')
  }
  if (needsIconPlaceholder) {
    const stub = join(FRONTEND_DIR, 'src/components/reui/icon-placeholder.tsx')
    if (!existsSync(stub)) {
      mkdirSync(dirname(stub), { recursive: true })
      writeFileSync(stub, ICON_PLACEHOLDER)
      written.push('src/components/reui/icon-placeholder.tsx')
      console.log('✓ icon-placeholder (stub de demo) escrito')
    }
  }
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const install = args.includes('--install')
const blocks = args.filter((a) => !a.startsWith('--'))
if (!blocks.length) {
  console.error('uso: node scripts/reui-download.mjs <bloco>... [--force] [--install]')
  process.exit(1)
}

const key = readLicenseKey()
for (const b of blocks) await collect(key, b, force)
writeFiles()

console.log('\n== arquivos escritos ==')
written.forEach((f) => console.log(' ', f))
if (npmDeps.size) {
  console.log('\n== deps npm ==\n ', [...npmDeps].join(' '))
  if (install) {
    const { execSync } = await import('node:child_process')
    execSync(`npm install ${[...npmDeps].join(' ')}`, { cwd: FRONTEND_DIR, stdio: 'inherit' })
    console.log('✓ deps instaladas')
  } else {
    console.log('  (rode com --install para instalar)')
  }
}
