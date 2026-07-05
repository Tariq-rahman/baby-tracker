// Local visual-check harness (DX.1.4). Boots the Vite dev server against the dev
// entry (index.dev.html → skips AuthGate, seeds Dexie), then screenshots every
// screen in light and dark to a gitignored screenshots/ dir.
//
// This is NOT an assertion suite — it produces PNGs for a human (or Claude, via
// the Read tool) to eyeball, honouring the project's "No E2E for the MVP" stance
// (CLAUDE.md). Not wired into CI.
//
// Usage: npm run shots   (one-time setup: npx playwright install chromium)

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'screenshots')
const DEV_ENTRY = '/index.dev.html'

// The screens to capture. `path` drives React Router; `weight` and `growth` are
// reachable only via the Trends card in-app, so we push their routes directly.
const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'history', path: '/history' },
  { name: 'trends', path: '/trends' },
  { name: 'weight', path: '/weight' },
  { name: 'growth', path: '/growth' },
  { name: 'settings', path: '/settings' },
]
const THEMES = ['light', 'dark']

/** Spawn `vite` and resolve with { url, stop } once it prints its local URL. */
function startDevServer() {
  return new Promise((resolvePromise, reject) => {
    const proc = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const timer = setTimeout(() => {
      proc.kill()
      reject(new Error('dev server did not start within 30s'))
    }, 30_000)

    const onData = (buf) => {
      const text = buf.toString()
      const match = text.match(/Local:\s+(http:\/\/\S+)/)
      if (match) {
        clearTimeout(timer)
        const url = match[1].replace(/\/$/, '')
        resolvePromise({ url, stop: () => proc.kill() })
      }
    }
    proc.stdout.on('data', onData)
    proc.stderr.on('data', onData)
    proc.on('error', reject)
  })
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const { url, stop } = await startDevServer()
  console.log(`dev server up at ${url}`)

  const browser = await chromium.launch()
  try {
    for (const theme of THEMES) {
      // Force the theme via localStorage before any page script runs. Theme is a
      // device-local pref (bt.theme); the pre-paint inline script reads it.
      const context = await browser.newContext({
        viewport: { width: 430, height: 932 }, // a phone-sized frame (one-handed UI)
        deviceScaleFactor: 2,
      })
      await context.addInitScript((t) => window.localStorage.setItem('bt.theme', t), theme)
      const page = await context.newPage()

      await page.goto(`${url}${DEV_ENTRY}`, { waitUntil: 'load' })
      await page.waitForSelector('nav', { timeout: 15_000 }) // shell mounted (post-seed)

      for (const route of ROUTES) {
        // Drive React Router client-side: pushState + a popstate the router listens for.
        await page.evaluate((path) => {
          window.history.pushState({}, '', path)
          window.dispatchEvent(new PopStateEvent('popstate'))
        }, route.path)
        await page.waitForTimeout(700) // let useLiveQuery data + charts settle
        const file = resolve(OUT_DIR, `${theme}-${route.name}.png`)
        await page.screenshot({ path: file, fullPage: true })
        console.log(`  ${theme}/${route.name} → ${file}`)
      }

      await context.close()
    }
  } finally {
    await browser.close()
    stop()
  }

  console.log(`\nDone. PNGs in ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
