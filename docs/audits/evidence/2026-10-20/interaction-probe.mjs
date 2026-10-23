import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'
const output = new URL('./', import.meta.url).pathname
const base = 'http://127.0.0.1:5199'
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true })
const results = []
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
const page = await context.newPage()
await page.addInitScript(() => { localStorage.setItem('autocare-hub-locale', 'en'); localStorage.setItem('autocare-hub-theme', 'light') })
const ready = async () => page.locator('html[data-autocare-ready="ready"]').waitFor()
try {
 await page.goto(`${base}/login`); await ready()
 await page.locator('#email').fill('emily.carter@example.com'); await page.locator('#password').fill('password123')
 await page.getByRole('button', { name: /^(sign in|войти)$/i }).click(); await page.waitForURL(u => !u.pathname.startsWith('/login'))
 await page.goto(`${base}/chats?chat=chat-request-owner-request-1`); await ready()
 const composer = page.locator('textarea').last()
 await composer.waitFor(); await composer.fill('SYNTHETIC SECRET FOR PROSERVICE ONLY')
 const secondConversation = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes('/service-requests/owner-request-2/conversation')); await page.getByTestId('chat-thread-list').getByRole('button').filter({ hasText: 'Диагностика тормозной системы' }).click(); await secondConversation
 await page.waitForURL(u => u.searchParams.get('chat') === 'chat-request-owner-request-2')
 await composer.waitFor()
 const valueAfterSwitch = await composer.inputValue()
 const submitted = page.waitForRequest(r => r.method() === 'POST' && /\/service-requests\/[^/]+\/messages$/.test(r.url()))
 await composer.locator('xpath=..').locator('button[type=submit]').click()
 const sent = await submitted; await page.getByText('SYNTHETIC SECRET FOR PROSERVICE ONLY', {exact:true}).last().waitFor()
 results.push({ id: 'cross-chat-draft', url: page.url(), valueAfterSwitch, sentTo: new URL(sent.url()).pathname, body: sent.postDataJSON().body })
 await page.screenshot({ path: `${output}cross-chat-draft.png`, fullPage: false })
 // Open an actual report dialog, including the extra fields for a threat report.
 await page.goto(`${base}/chats?chat=chat-inquiry-proservice`); await ready(); await page.locator('textarea').last().waitFor()
 console.log('MESSAGE ACTION BUTTONS', await page.getByTestId('chat-conversation-view').getByRole('button').evaluateAll(es => es.map(e => ({ text: e.innerText, name: e.getAttribute('aria-label') }))))
 const actions = page.getByTestId('chat-conversation-view').getByRole('button', { name: 'Message actions', exact: true }).last()
 await actions.click(); console.log('MENU', await page.getByRole('menu').innerText())
 await page.getByRole('menuitem', { name: /report|пожаловаться/i }).click()
 const dialog = page.getByRole('dialog'); await dialog.waitFor()
 const select = dialog.locator('select'); console.log('REPORT OPTIONS', await select.locator('option').allTextContents())
 await select.selectOption('threat')
 await page.setViewportSize({ width: 360, height: 568 })
 const geometry = await dialog.evaluate(e => {
  const r = e.getBoundingClientRect(), buttons = [...e.querySelectorAll('button')].map(b => {const q=b.getBoundingClientRect();return {name:b.innerText,top:q.top,bottom:q.bottom}})
  return { top:r.top, bottom:r.bottom, height:r.height, viewportHeight:innerHeight, overflowY:getComputedStyle(e).overflowY, bodyOverflow:getComputedStyle(document.body).overflow, backgroundInert:[...document.querySelectorAll('main')].every(n=>n.inert), buttons }
 })
 const axe = await new AxeBuilder({ page }).analyze()
 results.push({ id:'report-dialog-small-viewport', geometry, axe:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})) })
 await page.screenshot({ path:`${output}report-dialog-360x568.png`, fullPage:false })
 await page.keyboard.press('Escape'); await page.setViewportSize({ width:1440,height:900 })
 // Inspect the booking time selected after restoring the saved draft.
 await page.goto(`${base}/services/api-proservice-moscow/request?service=oil-change`); await ready()
 await page.locator('form [data-request-step="2"]').waitFor()
 const times = page.locator('form [data-request-step="2"] button').filter({ hasText:/^\d{2}:\d{2}$/ })
 await times.last().waitFor()
 const chosen = await times.last().innerText(); await times.last().click()
 await page.waitForFunction(chosen => Object.keys(localStorage).some(k => { if (!k.startsWith('autocare-request:')) return false; try { return JSON.parse(localStorage.getItem(k)).data.selectedTime === chosen } catch { return false } }), chosen)
 const draft = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('autocare-request:')).map(k=>[k,JSON.parse(localStorage.getItem(k))])))
 await page.reload(); await ready(); await times.last().waitFor()
 const restored = await page.locator('form [data-request-step="2"] button[aria-pressed="true"]').allTextContents()
 results.push({id:'booking-time-restore',chosen,draft,restored})
 await page.screenshot({path:`${output}booking-time-restored.png`,fullPage:false})
} catch(error) { results.push({id:'probe-error',message:error.message,stack:error.stack}); console.error(error.message) }
finally { await writeFile(`${output}interaction-probe.json`,JSON.stringify(results,null,2)); await browser.close() }
console.log(JSON.stringify(results,null,2))
