// Live production audit using a temporary guest account.
// Avoids creating race rooms, submitting scores or changing other users' data.
// The separate branch does not modify deployed application source code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';

const base=process.env.KEYDERBY_URL || 'https://keyderby.emon721.workers.dev';
const moduleUrl=pathToFileURL('/tmp/keyderby-audit/node_modules/playwright-core/index.mjs');
const {chromium}=await import(moduleUrl.href);
fs.mkdirSync('audit-output',{recursive:true});
const checks=[], errors=[];
let browser, page, context, guestCreated=false, cleanupSucceeded=false;
async function test(name,work){
  try { const details=await work();checks.push({name,status:'PASS',details:details||''});console.log('PASS '+name+(details?' — '+details:'')); }
  catch(e){checks.push({name,status:'FAIL',error:String(e)});console.error('FAIL '+name+': '+e); }
}
try{
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  context=await browser.newContext({viewport:{width:1440,height:900},locale:'en-US',serviceWorkers:'block'});
  page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  const started=Date.now();
  await test('HTTPS home responds with 200',async()=>{
    const r=await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(r?.status(),200,'Unexpected homepage HTTP status');
    return 'HTTP '+r.status()+'; '+(Date.now()-started)+'ms';
  });
  await test('Guest session initializes in real production',async()=>{
    await page.locator('.profile-button:not([disabled])').waitFor({state:'visible',timeout:45000});
    guestCreated=true;
    const b=await page.evaluate(async()=>{
      const r=await fetch('/api/bootstrap',{credentials:'same-origin'});
      return {status:r.status,headers:{cache:r.headers.get('cache-control')},data:await r.json()};
    });
    assert.equal(b.status,200,JSON.stringify(b.data));
    assert.match(b.data.user.publicId,/^KD-\d{5,}$/);
    assert.equal(b.data.passageCount,4000);
    return b.data.user.publicId+'; production passage count '+b.data.passageCount;
  });
  await test('Desktop navigation excludes Words and Progress',async()=>{
    const names=(await page.locator('nav.desktop-nav a').allTextContents()).map(s=>s.trim());
    assert.deepEqual(names,['Practice','Race','Rankings']);return names.join(' / ');
  });
  await test('Practice has automatic passage and only duration control',async()=>{
    await page.locator('.typing-config').waitFor({state:'visible'});
    assert.equal(await page.locator('.typing-config select').count(),1);
    assert.match(await page.locator('.typing-config').innerText(),/Duration/);
    assert.equal(await page.getByLabel('Difficulty').count(),0);
    return 'Duration dropdown; no Difficulty/passages selector';
  });
  await test('All 3,200 Practice catalog IDs reachable without duplicates',async()=>{
    const ids=new Set();let total=0;
    for(let offset=0;offset<3200;offset+=500){
      const r=await page.evaluate(async ({offset})=>{
        const s=await fetch('/api/passages/options?difficulty=mixed&offset='+offset+'&limit=500',{credentials:'same-origin'});
        return {status:s.status,body:await s.json()};
      },{offset});
      assert.equal(r.status,200,'Catalog page HTTP '+offset);
      assert.equal(r.body.total,3200,'Unexpected catalog total');
      for(const p of r.body.passages){assert.ok(p.id);assert.ok(p.title);assert.match(p.difficulty,/^(easy|medium|hard)$/);assert.ok(!ids.has(p.id),'Duplicate catalog ID '+p.id);ids.add(p.id);}
      total+=r.body.passages.length;
    }
    assert.equal(total,3200);
    assert.equal(ids.size,3200);
    return '7 paginated API reads; all 3,200 metadata records unique';
  });
  await test('Production passage text and word counts accessible',async()=>{
    const entries=await page.evaluate(async()=>{
      const r=await fetch('/api/passages/options?difficulty=mixed&offset=0&limit=3');
      return (await r.json()).passages;
    });
    for(const p of entries){
      const v=await page.evaluate(async({id})=>{
        const r=await fetch('/api/passages/'+encodeURIComponent(id));
        return {status:r.status,body:await r.json()};
      },{id:p.id});
      assert.equal(v.status,200);
      assert.equal(v.body.text.trim().split(/\s+/).length,v.body.words);
      assert.equal(v.body.id,p.id);
    }
    return '3 live sample full texts verified; all 4,000 text structures validated separately in CI';
  });
  await test('Profile dropdown includes Progress, Settings, dark mode',async()=>{
    await page.locator('.profile-button').click();
    const text=await page.locator('.profile-menu-panel').innerText();
    for(const item of ['My profile','My progress','Settings & ranking privacy','Enable dark mode'])assert.ok(text.includes(item),item+' missing');
    await page.screenshot({path:'audit-output/desktop-profile.png',fullPage:false});
    await page.locator('.profile-button').click();
  });
  await test('Public Race entry exists without manual difficulty selector',async()=>{
    await page.locator('nav.desktop-nav a').filter({hasText:'Race'}).click();
    await page.getByRole('button',{name:/Enter race/i}).waitFor({state:'visible'});
    assert.equal(await page.getByLabel('Difficulty').count(),0);
    return 'Verified race entry UI; no matchmaking request made';
  });
  await test('Friends Race room controls exist',async()=>{
    await page.getByRole('button',{name:/With friends/i}).click();
    assert.ok(await page.getByRole('button',{name:/Create friends room/i}).count());
    assert.ok(await page.locator('.room-create select').count()>=2);
    return 'Capacity + duration controls; no real room created';
  });
  await test('Rankings API enforces maximum 30 and reports users',async()=>{
    const r=await page.evaluate(async()=>{
      const s=await fetch('/api/leaderboard?period=weekly&difficulty=easy&duration=60');
      return {status:s.status,body:await s.json()};
    });
    assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(r.body.maxRank,30);
    assert.ok(Array.isArray(r.body.entries));
    assert.ok(r.body.entries.length<=30);
    return r.body.entries.length+' ranked entries';
  });
  await test('Rankings navigation loads without JavaScript error',async()=>{
    await page.locator('nav.desktop-nav a').filter({hasText:'Rankings'}).click();
    await page.locator('main').waitFor({state:'visible'});
    return 'Rankings navigation loaded';
  });
  await test('Mobile layout has navigation and no horizontal overflow',async()=>{
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.locator('nav.mobile-core-nav').isVisible());
    const m=await page.evaluate(()=>({viewport:window.innerWidth,documentWidth:document.documentElement.scrollWidth}));
    assert.ok(m.documentWidth<=m.viewport+3,'Mobile horizontal overflow: '+JSON.stringify(m));
    await page.screenshot({path:'audit-output/mobile.png',fullPage:false});
    return m.documentWidth+'/'+m.viewport+' CSS pixels';
  });
  await test('No unexpected browser runtime exceptions',async()=>{
    assert.deepEqual(errors,[]);
  });
  await test('Authenticated API response has private cache headers',async()=>{
    const r=await page.evaluate(async()=>{
      const a=await fetch('/api/profile',{credentials:'same-origin'});
      return {status:a.status,cache:a.headers.get('cache-control'),type:a.headers.get('x-content-type-options')};
    });
    assert.equal(r.status,200);
    assert.match(r.cache||'',/no-store/);
    assert.equal(r.type,'nosniff');
  });
} catch(e) {
  checks.push({name:'Audit setup / browser availability',status:'FAIL',error:String(e)});
  console.error('FATAL AUDIT: '+e);
} finally {
  if(page && guestCreated){
    try{
      const r=await page.evaluate(async()=> {
        const response=await fetch('/api/profile',{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'});
        return {status:response.status,body:await response.json()};
      });
      cleanupSucceeded=r.status===200&&r.body.ok===true;
      console.log('Guest cleanup:',JSON.stringify({status:r.status,success:cleanupSucceeded}));
    }catch(e){console.warn('Guest cleanup failure: '+String(e))}
  }
  await browser?.close().catch(()=>{});
  fs.writeFileSync('audit-output/report.json',JSON.stringify({time:new Date().toISOString(),base,checks,exceptions:errors,cleanupSucceeded},null,2));
}
const failures=checks.filter(x=>x.status==='FAIL');
console.log('LIVE AUDIT: '+(checks.length-failures.length)+' passed / '+checks.length+' tests; cleanup='+cleanupSucceeded);
if(failures.length || !cleanupSucceeded)process.exitCode=1;