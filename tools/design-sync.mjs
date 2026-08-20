#!/usr/bin/env node
// design-sync — вытаскивает дизайн из бандла Claude Design и держит код сверенным с ним.
//
// Бандл (`Playback Rental - прокат техники.html`) — не обычный HTML: это
// самораспаковывающийся артефакт. Внутри четыре <script type="__bundler/*">:
//   manifest      — base64 (+gzip для JS) ассеты: рантайм, логика компонента, шрифты
//   template      — JSON-строка с реальной HTML-разметкой всех экранов ({{ }}-биндинги)
//   page_order    — порядок страниц
//   ext_resources — внешние ссылки (Google Fonts и т.п.)
//
// Разметка в шаблоне — сплошные inline-стили плюс два нестандартных атрибута,
// `style-hover` и `style-focus`, которые применяет рантайм артефакта. Ни один
// браузер их не понимает — поэтому «просто открыть бандл» не работает, и поэтому
// ховеры теряются при ручном переносе. Команда `spec` превращает их в настоящий CSS.
//
// Использование:
//   node tools/design-sync.mjs extract "Playback Rental - прокат техники.html"
//   node tools/design-sync.mjs spec
//   node tools/design-sync.mjs audit apps/web/src
//
// Зависимостей нет — только Node 22+.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, extname } from 'node:path'

const REF_DIR = 'docs/design-reference'
const TEMPLATE = join(REF_DIR, 'template.html')
const SPEC_DIR = join(REF_DIR, 'spec')

// ---------------------------------------------------------------- helpers

const die = (msg) => {
  console.error(`design-sync: ${msg}`)
  process.exit(1)
}

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag)
  return i > -1 ? process.argv[i + 1] : fallback
}

function scriptBody(html, type) {
  // Тела <script> не экранируются, поэтому ищем по конкретному type и до
  // ближайшего </script> — вложенных script внутри этих блоков не бывает.
  const re = new RegExp(`<script type="${type.replace('/', '\\/')}"[^>]*>([\\s\\S]*?)</script>`)
  const m = html.match(re)
  return m ? m[1] : null
}

const countBy = (list) => {
  const m = new Map()
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// Короткий стабильный хэш — имена классов не должны прыгать между прогонами,
// иначе каждый ре-экспорт даёт бессмысленный diff во всех файлах разом.
function hash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36).slice(0, 5)
}

const walk = (dir, exts, acc = []) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, exts, acc)
    else if (exts.includes(extname(p))) acc.push(p)
  }
  return acc
}

// ---------------------------------------------------------------- extract

function extract() {
  const bundlePath = process.argv[3]
  if (!bundlePath) die('нужен путь к бандлу: design-sync extract <bundle.html>')
  const outDir = arg('--out', REF_DIR)
  const html = readFileSync(bundlePath, 'utf8')

  const rawManifest = scriptBody(html, '__bundler/manifest')
  const rawTemplate = scriptBody(html, '__bundler/template')
  if (!rawManifest || !rawTemplate) {
    die('это не бандл Claude Design — не нашёл __bundler/manifest или __bundler/template')
  }

  mkdirSync(outDir, { recursive: true })
  mkdirSync(join(outDir, 'assets'), { recursive: true })

  const manifest = JSON.parse(rawManifest)
  // template — JSON-строка, а не объект: сначала распарсить, потом это уже HTML.
  let template = JSON.parse(rawTemplate)

  let fontN = 0
  let scriptN = 0
  const written = []

  for (const [id, entry] of Object.entries(manifest)) {
    let buf = Buffer.from(entry.data, 'base64')
    if (entry.compressed) buf = gunzipSync(buf)

    let name
    if (entry.mime === 'font/woff2') name = `assets/font-${++fontN}.woff2`
    // Все JS-чанки манифеста — рантайм артефакта, а не код этого дизайна:
    // логика компонента лежит отдельно, внутри самого шаблона (см. ниже).
    else if (entry.mime === 'text/javascript') name = `assets/runtime-${++scriptN}.js`
    else name = `assets/asset-${id.slice(0, 8)}`

    writeFileSync(join(outDir, name), buf)
    written.push([name, buf.length])
    // В шаблоне ассеты подключены по UUID — переписываем на реальные имена,
    // иначе распакованный шаблон ссылается в пустоту.
    template = template.split(id).join(name.startsWith('assets/') ? name : `./${name}`)
  }

  writeFileSync(join(outDir, 'template.html'), template)
  written.push(['template.html', Buffer.byteLength(template)])

  // Логика экранов живёт не в манифесте, а вложенным <script type="text/x-dc">
  // внутри шаблона: состояние, данные-заглушки, вычисления для {{ }}-биндингов.
  // Вытаскиваем отдельным файлом — это единственный кусок бандла, который
  // читают как исходник, а не как ассет.
  const dc = scriptBody(template, 'text/x-dc')
  if (dc) {
    writeFileSync(join(outDir, 'dc_script.js'), dc)
    written.push(['dc_script.js', Buffer.byteLength(dc)])
  } else {
    console.warn('  ! <script type="text/x-dc"> в шаблоне не найден — формат бандла изменился')
  }

  console.log(`Распаковано в ${outDir}/`)
  for (const [name, size] of written) console.log(`  ${name.padEnd(28)} ${(size / 1024).toFixed(1)} КБ`)
  console.log(`\nШаблон содержит все экраны. Дальше: node tools/design-sync.mjs spec`)
}

// ---------------------------------------------------------------- spec

// Собирает из шаблона всё, что относится к движению и состояниям.
function readSpec(templatePath) {
  let t
  try {
    t = readFileSync(templatePath, 'utf8')
  } catch {
    die(`не нашёл шаблон ${templatePath}\n  запусти сначала: node tools/design-sync.mjs extract <bundle.html>\n  (или укажи путь через --template)`)
  }

  const easings = countBy(t.match(/cubic-bezier\([^)]*\)/g) ?? [])
  const transitions = t.match(/transition:[^;"]*/g) ?? []
  const durations = countBy(transitions.flatMap((s) => [...s.matchAll(/(\d+)ms/g)].map((m) => m[1])))
  const animations = countBy((t.match(/animation:\s*bn[A-Za-z]+[^;"']*/g) ?? []).map((s) => s.trim()))
  const keyframes = countBy([...t.matchAll(/animation:\s*(bn[A-Za-z]+)/g)].map((m) => m[1]))

  // Каждое вхождение style-hover/style-focus вместе с тегом-владельцем и
  // кусочком контекста — без контекста таблица бесполезна, по ней не найти место.
  const states = []
  const re = /<([a-zA-Z][\w-]*)\b([^>]*?)style-(hover|focus)="([^"]*)"([^>]*)>/g
  let m
  while ((m = re.exec(t))) {
    const [, tag, before, kind, value, after] = m
    const attrs = before + after
    const style = attrs.match(/\sstyle="([^"]*)"/)?.[1] ?? ''
    const ctx = t
      .slice(m.index + m[0].length, m.index + m[0].length + 90)
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    states.push({ tag, kind, value, transition: style.match(/transition:[^;"]*/)?.[0] ?? null, ctx })
  }

  return { easings, durations, animations, keyframes, states, transitionCount: transitions.length }
}

function spec() {
  const templatePath = arg('--template', TEMPLATE)
  const outDir = arg('--out', SPEC_DIR)
  const s = readSpec(templatePath)
  mkdirSync(outDir, { recursive: true })

  // --- tokens.css ---
  // Дизайн держится на трёх кривых. Каждая получает имя, а не копипастится
  // по месту — иначе при переносе она молча теряется (что и произошло).
  const easeNames = new Map()
  const NAMED = {
    'cubic-bezier(0.16,1,0.3,1)': 'expo',
    'cubic-bezier(0.34,1.56,0.64,1)': 'overshoot',
    'cubic-bezier(0.45,0,0.15,1)': 'inout',
  }
  s.easings.forEach(([curve], i) => {
    const key = curve.replace(/\s+/g, '')
    easeNames.set(curve, NAMED[key] ?? `curve-${i + 1}`)
  })

  const tokens = [
    '/* Сгенерировано: node tools/design-sync.mjs spec — не править руками. */',
    '/* Источник: ' + templatePath + ' */',
    '',
    '@theme {',
    '  /* Кривые движения. Дефолт Tailwind — cubic-bezier(0.4,0,0.2,1) — в дизайне',
    '     не встречается ни разу: ставить ease-* осознанно на каждом переходе. */',
    ...s.easings.map(([c, n]) => `  --ease-${easeNames.get(c)}: ${c}; /* ${n}× в дизайне */`),
    '',
    '  /* Длительности переходов, по частоте в дизайне. */',
    ...s.durations.map(([d, n]) => `  --duration-${d}: ${d}ms; /* ${n}× */`),
    '}',
    '',
  ].join('\n')
  writeFileSync(join(outDir, 'tokens.css'), tokens)

  // --- interactions.css ---
  // Один класс на каждое различное значение style-hover/style-focus.
  const byValue = new Map()
  for (const st of s.states) {
    const key = `${st.kind}|${st.value}`
    if (!byValue.has(key)) byValue.set(key, { ...st, uses: [] })
    byValue.get(key).uses.push(st.ctx)
  }

  const decls = (v) =>
    v
      .split(';')
      .filter(Boolean)
      .map((d) => `  ${d.trim()};`)
      .join('\n')

  const rules = ['/* Сгенерировано: node tools/design-sync.mjs spec — не править руками. */', '']
  const index = []
  for (const [key, st] of [...byValue.entries()].sort((a, b) => b[1].uses.length - a[1].uses.length)) {
    const cls = `d-${st.kind[0]}${hash(key)}`
    index.push({ class: cls, kind: st.kind, value: st.value, transition: st.transition, count: st.uses.length, sample: st.uses[0] })
    rules.push(`/* ${st.uses.length}× · ${st.tag} · «${(st.uses[0] || '').slice(0, 60)}» */`)
    if (st.transition) rules.push(`.${cls} {\n  ${st.transition};\n}`)
    rules.push(`.${cls}:${st.kind === 'focus' ? 'focus-visible' : 'hover'} {\n${decls(st.value)}\n}`, '')
  }
  writeFileSync(join(outDir, 'interactions.css'), rules.join('\n'))
  writeFileSync(join(outDir, 'spec.json'), JSON.stringify({ ...s, index }, null, 2))

  console.log(`Спека собрана из ${templatePath}\n`)
  console.log(`  кривых движения:     ${s.easings.length}  (${s.easings.map(([c, n]) => `${easeNames.get(c)}=${n}×`).join(', ')})`)
  console.log(`  длительностей:       ${s.durations.length}  (${s.durations.slice(0, 4).map(([d, n]) => `${d}ms=${n}×`).join(', ')}…)`)
  console.log(`  переходов всего:     ${s.transitionCount}`)
  console.log(`  hover/focus правил:  ${s.states.length}, различных: ${byValue.size}`)
  console.log(`  анимаций:            ${s.animations.reduce((a, x) => a + x[1], 0)} на ${s.keyframes.length} keyframes`)
  console.log(`\nЗаписано: ${outDir}/tokens.css, interactions.css, spec.json`)
}

// ---------------------------------------------------------------- audit

function audit() {
  const dirs = process.argv.slice(3).filter((a) => !a.startsWith('--'))
  if (!dirs.length) die('нужна папка с кодом: design-sync audit apps/web/src')
  const s = readSpec(arg('--template', TEMPLATE))

  const files = dirs.flatMap((d) => walk(d, ['.astro', '.tsx', '.jsx', '.ts', '.css']))
  const code = files.map((f) => readFileSync(f, 'utf8')).join('\n')

  const transitionClasses = (code.match(/\btransition(-\[[^\]]*\]|-[a-z]+)?\b/g) ?? []).length
  const easeClasses = (code.match(/\bease-[\w[\]().,-]+/g) ?? []).length
  const inlineEasings = countBy(code.match(/cubic-bezier\([^)]*\)/g) ?? [])
  const durClasses = countBy(code.match(/\bduration-\[?(\d+)m?s?\]?/g) ?? [])
  const groupHover = (code.match(/group-hover:/g) ?? []).length
  const hovers = (code.match(/hover:/g) ?? []).length
  const focuses = (code.match(/focus(-visible)?:/g) ?? []).length

  const designKf = new Map(s.keyframes)
  // Optional leading quote: Astro's inline `style="animation:bnX..."` has
  // none, but a ported React/JSX `style={{ animation: 'bnX...' }}` always
  // does — without tolerating it here, every animation in ported .tsx code
  // audits as 0×, which defeats the point of auditing ported code at all.
  const codeKf = new Map(countBy([...code.matchAll(/animation:\s*['"]?(bn[A-Za-z]+)/g)].map((m) => m[1])))

  const L = []
  L.push(`Файлов просмотрено: ${files.length}\n`)

  L.push('КРИВЫЕ ДВИЖЕНИЯ')
  L.push(`  переходов в коде:            ${transitionClasses}`)
  L.push(`  из них с явным ease-*:       ${easeClasses}`)
  const unEased = transitionClasses - easeClasses
  if (unEased > 0) {
    L.push(`  ⚠ без указанной кривой:      ${unEased} → идут на дефолте Tailwind cubic-bezier(0.4,0,0.2,1),`)
    L.push(`                                 которого в дизайне нет ни разу`)
  }
  for (const [curve, n] of s.easings) {
    const inCode = (inlineEasings.find(([c]) => c.replace(/\s+/g, '') === curve.replace(/\s+/g, '')) ?? [, 0])[1]
    const mark = inCode < n ? '⚠' : '✓'
    L.push(`  ${mark} ${curve.padEnd(32)} дизайн ${String(n).padStart(3)}×   код ${inCode}× (inline)`)
  }

  L.push('\nДЛИТЕЛЬНОСТИ')
  const topDesign = s.durations[0]
  L.push(`  доминанта дизайна:           ${topDesign[0]}ms (${topDesign[1]}×)`)
  for (const [cls, n] of durClasses.slice(0, 6)) {
    const val = cls.match(/(\d+)/)[1]
    const known = s.durations.find(([d]) => d === val)
    L.push(`  ${known ? '✓' : '⚠'} ${cls.padEnd(20)} ${String(n).padStart(3)}×  ${known ? '' : `— в дизайне такой длительности нет`}`)
  }

  L.push('\nСОСТОЯНИЯ')
  L.push(`  hover-правил в дизайне:      ${s.states.filter((x) => x.kind === 'hover').length}`)
  L.push(`  hover:-классов в коде:       ${hovers}   (Tailwind дробит одно правило на несколько классов)`)
  L.push(`  focus-правил в дизайне:      ${s.states.filter((x) => x.kind === 'focus').length}`)
  L.push(`  focus:-классов в коде:       ${focuses}`)
  L.push(`  group-hover: в коде:         ${groupHover}`)

  L.push('\nАНИМАЦИИ ПОЯВЛЕНИЯ')
  for (const [kf, n] of s.keyframes) {
    const inCode = codeKf.get(kf) ?? 0
    L.push(`  ${inCode >= n ? '✓' : '⚠'} ${kf.padEnd(10)} дизайн ${String(n).padStart(2)}×   код ${String(inCode).padStart(2)}×`)
  }
  for (const [kf] of codeKf) if (!designKf.has(kf)) L.push(`  ? ${kf.padEnd(10)} есть в коде, нет в дизайне`)

  console.log(L.join('\n'))
}

// ---------------------------------------------------------------- main

const cmd = process.argv[2]
if (cmd === 'extract') extract()
else if (cmd === 'spec') spec()
else if (cmd === 'audit') audit()
else {
  console.log(`design-sync — синхронизация кода с бандлом Claude Design

  extract <bundle.html> [--out ${REF_DIR}]
      Распаковать бандл: template.html (все экраны), dc_script.js (логика),
      шрифты. Запускать после каждого нового экспорта из Claude Design.

  spec [--template ${TEMPLATE}] [--out ${SPEC_DIR}]
      Собрать из шаблона tokens.css (кривые + длительности как @theme-токены)
      и interactions.css (style-hover/style-focus → настоящие CSS-классы).

  audit <dir...> [--template ${TEMPLATE}]
      Сверить реализацию со спекой и показать расхождения.`)
}
