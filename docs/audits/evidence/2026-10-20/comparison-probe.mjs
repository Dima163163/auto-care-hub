import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const output=new URL('./',import.meta.url).pathname
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const results={items:[],probeErrors:[]}
try {
 await page.addInitScript(()=>{localStorage.setItem('autocare-hub-locale','en');localStorage.setItem('autocare-hub-theme','light')})
 page.on('response', async r=>{if(r.request().method()==='GET'&&r.url().includes('/discovery/providers?')) {const d=await r.json();results.items=d.items.map(i=>({name:i.provider.name,priceType:i.offer.priceType,from:i.offer.priceFromMinor,to:i.offer.priceToMinor}))}})
 await page.goto('http://127.0.0.1:5199/services?service=oil-change&market=moscow');await page.locator('html[data-autocare-ready="ready"]').waitFor()
 const choices=page.locator('article').getByRole('button',{name:'Compare selected',exact:true})
 await choices.first().waitFor()
 const cards=page.locator('article').filter({has:page.getByRole('button',{name:'Compare selected',exact:true})})
 let quoteIndex=-1
 for(let i=0;i<await cards.count();i++){if((await cards.nth(i).innerText()).includes('Quote required')){quoteIndex=i;break}}
 results.quoteIndex=quoteIndex
 results.cardBefore=await cards.nth(quoteIndex<0?0:quoteIndex).innerText()
 await choices.nth(quoteIndex<0?0:quoteIndex).click()
 await choices.nth(quoteIndex===0?1:0).click()
 const table=page.getByRole('table')
 await table.waitFor()
 results.table=await table.innerText()
 await table.scrollIntoViewIfNeeded()
 await page.screenshot({path:`${output}comparison-price.png`,fullPage:false})
 await page.getByRole('button',{name:'Compare selected',exact:true}).last().click()
 results.afterCompareAction=await page.evaluate(()=>({scrollY,table:document.querySelector('table').getBoundingClientRect().toJSON(),map:document.getElementById('comparison-map').getBoundingClientRect().toJSON()}))
} catch(e){results.probeErrors.push(e.message)} finally {await writeFile(`${output}comparison-probe.json`,JSON.stringify(results,null,2));await browser.close()}
console.log(JSON.stringify(results,null,2))
