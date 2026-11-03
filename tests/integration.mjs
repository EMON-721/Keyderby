import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json')),{Miniflare}=wr('miniflare');
const mf=new Miniflare({modules:['index.js',...fs.readdirSync('dist/server',{recursive:true}).filter(f=>f.endsWith('.js')&&f!=='index.js')].map(f=>({type:'ESModule',path:path.resolve('dist/server',f)})),modulesRoot:path.resolve('dist/server'),compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']});
const checks=[],record=s=>{checks.push(s);console.log('PASS '+s)},sleep=ms=>new Promise(r=>setTimeout(r,ms));
function client(){let cookie='';return async(p,body,method,extra={})=>{const r=await mf.dispatchFetch('https://keyderby.test/api/'+p,{method:method||(body?'POST':'GET'),headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json',Origin:'https://keyderby.test'}:{}),...extra},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {r,d:await r.json()}}}
try{
 const db=await mf.getD1Database('DB');for(const f of fs.readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of fs.readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint'))if(sql.trim())await db.prepare(sql).run();
 const a=client(),b=client(),c=client();let x=await a('bootstrap');assert.equal(x.r.status,200,JSON.stringify(x.d));assert.equal(x.d.passageCount,4000);assert.ok(x.r.headers.get('set-cookie').includes('HttpOnly'));assert.ok(x.r.headers.get('set-cookie').includes('Secure'));const userA=x.d.user.id;assert.equal(x.d.user.publicId,'KD-22301');assert.notEqual(x.d.user.publicId,userA);record('Automatic 4,000-passage initialization and secure guest session');
 x=await a('profile',{name:'Test Typist A'});assert.equal(x.r.status,200);assert.equal(x.d.user.id,userA);const recovery=x.d.recoveryCode;assert.ok(recovery.startsWith('KD-'));assert.ok(!('recovery' in x.d.user));assert.equal((await a('bootstrap')).d.user.id,userA);record('Name-only profile, automatic ID and persistent ownership');
 await b('bootstrap');const userBProfile=(await b('profile',{name:'Test Typist B'})).d.user;const userB=userBProfile.id;assert.notEqual(userA,userB);assert.equal(userBProfile.publicId,'KD-22302');assert.equal((await c('recover',{code:recovery})).d.user.id,userA);record('Optional recovery on a separate client');
 const lib=(await a('passages?difficulty=easy&limit=50')).d;assert.equal(lib.total,1502);assert.ok(lib.passages.every(p=>p.displayId.startsWith('E')&&p.difficulty==='easy'));const first=lib.passages[0];assert.equal((await a('passages/'+first.id)).d.displayId,first.displayId);record('Stable passage numbers, names, direct lookup and difficulty');const addedRows=(await db.prepare("SELECT count(*) n FROM passages WHERE id LIKE 'EXPAND-%'").first()).n;
  assert.equal(addedRows,1000,'One thousand new rows must be present in D1, not just in files');
  const extra=JSON.parse(fs.readFileSync('content/passages-extra-1.json','utf8'))[0];
  const newPassage=(await a('passages/'+extra.id)).d;
  assert.equal(newPassage.id,extra.id);
  assert.equal(newPassage.text,extra.text);
  assert.equal(newPassage.words,extra.words);
  assert.match(newPassage.displayId,/^[EMH][0-9]{4}$/);
  assert.ok(Number(newPassage.number)>1000);
  record('One thousand new passages are persisted and retrievable from D1 alongside original 3,000');
  // This is the exact endpoint used by the live Practice / Timed test dropdown.
  // Every published D1 row must be reachable through a metadata-only page.
  const expectedCounts={easy:1502,medium:898,hard:800,mixed:3200};
  for (const [difficulty,expectedTotal] of Object.entries(expectedCounts)) {
    const found=new Set();
    for (let offset=0;offset<expectedTotal;offset+=500) {
      const response=await a('passages/options?difficulty='+difficulty+'&offset='+offset+'&limit=500');
      assert.equal(response.r.status,200,JSON.stringify(response.d));
      assert.equal(response.d.total,expectedTotal,'Wrong catalog total for '+difficulty);
      assert.ok(response.d.passages.length>0&&response.d.passages.length<=500);
      for (const item of response.d.passages) {
        assert.ok(item.id && item.title && item.displayId && item.number);
        assert.ok(!('text' in item),'Dropdown must not download full passage bodies');
        assert.ok(!found.has(item.id),'Duplicate item in dropdown: '+item.id);
        if(difficulty!=='mixed')assert.equal(item.difficulty,difficulty);
        found.add(item.id);
      }
    }
    assert.equal(found.size,expectedTotal,'Missing passage choices in '+difficulty);
  }
  const poolRows=(await db.prepare("SELECT pool, count(*) n FROM passages WHERE status='published' GROUP BY pool ORDER BY pool").all()).results;
  assert.deepEqual(Object.fromEntries(poolRows.map(x=>[x.pool,x.n])),{friends_race:200,practice:3200,public_race:600});
  assert.equal((await db.prepare("SELECT count(DISTINCT id) n FROM passages WHERE status='published'").first()).n,4000);
  const publicOnly=(await db.prepare("SELECT id FROM passages WHERE pool='public_race' LIMIT 1").first()).id;
  const friendsOnly=(await db.prepare("SELECT id FROM passages WHERE pool='friends_race' LIMIT 1").first()).id;
  assert.equal((await a('attempts',{mode:'practice',passageId:publicOnly,duration:60})).r.status,400);
  assert.equal((await a('attempts',{mode:'practice',passageId:friendsOnly,duration:60})).r.status,400);
  const visibleIds=new Set();
  for (let offset=0;offset<3200;offset+=500) {
    const page=(await a('passages/options?difficulty=mixed&limit=500&offset='+offset)).d;
    for (const p of page.passages) visibleIds.add(p.id);
  }
  assert.equal(visibleIds.size,3200);
  assert.ok(!visibleIds.has(publicOnly) && !visibleIds.has(friendsOnly));
  record('Exactly 3,200 Practice, 600 Public Race, 200 Friends Race; zero overlapping passage IDs');
  // Per-user rotation: repeated request keys are idempotent; distinct requests never repeat in cycle 1.
  const key1=crypto.randomUUID(),key2=crypto.randomUUID();
  const firstAssigned=await a('practice/next',{difficulty:'easy',requestKey:key1});
  assert.equal(firstAssigned.r.status,200,JSON.stringify(firstAssigned.d));
  assert.equal(firstAssigned.d.cycle,1);
  assert.equal(firstAssigned.d.total,3200);
  const id1=firstAssigned.d.passage.id;
  assert.equal(firstAssigned.d.passage.pool,'practice');
  assert.equal(firstAssigned.d.passage.difficulty,'easy','First Practice assignment should be easy');
  const replay=(await a('practice/next',{difficulty:'easy',requestKey:key1})).d;
  assert.equal(replay.passage.id,id1,'Repeated request key must not consume another passage');
  assert.equal(replay.used,firstAssigned.d.used);
  const secondAssigned=(await a('practice/next',{difficulty:'easy',requestKey:key2})).d;
  assert.notEqual(secondAssigned.passage.id,id1,'Next Practice passage cannot repeat the prior one');
  assert.equal(secondAssigned.passage.difficulty,'hard','Second Practice assignment should be hard');
  assert.equal(secondAssigned.used,firstAssigned.d.used+1);
  assert.equal((await a('attempts',{passageId:id1,mode:'practice',duration:60})).r.status,400,'Previously assigned passage may not be replayed');
  const thirdAssigned=(await a('practice/next',{difficulty:'easy',requestKey:crypto.randomUUID()})).d;
  assert.equal(thirdAssigned.passage.difficulty,'medium','Third Practice assignment should be medium');
  const fourthAssigned=(await a('practice/next',{difficulty:'easy',requestKey:crypto.randomUUID()})).d;
  assert.equal(fourthAssigned.used,thirdAssigned.used+1);
  assert.ok(![id1,secondAssigned.passage.id,thirdAssigned.passage.id].includes(fourthAssigned.passage.id));
  const practicePassage=fourthAssigned.passage;
  record('Practice levels rotate Easy, Hard, Medium, Mixed without user difficulty input');
  const other=(await b('practice/next',{difficulty:'mixed',requestKey:crypto.randomUUID()})).d;
  assert.equal(other.used,1,'Each user has a separate Practice rotation');
  assert.equal((await a('practice/next',{difficulty:'easy',requestKey:'invalid'})).r.status,400);
  record('Automatic per-profile assignment, retry idempotency, no consecutive repeats');
  const bounded=(await a('passages/options?difficulty=mixed&offset=0&limit=999999')).d;
  assert.equal(bounded.passages.length,500,'Metadata page maximum must remain bounded');
  record('All 3,200 dedicated Practice passages are reachable exactly once in the searchable catalog');
  
 let attempt=(await a('attempts',{passageId:practicePassage.id,mode:'practice',duration:0})).d.attempt;assert.equal(attempt.duration,60);assert.equal((await b('attempts/'+attempt.id+'/start',{})).r.status,404);await a('attempts/'+attempt.id+'/start',{});assert.equal((await a('attempts/'+attempt.id+'/pause',{pause:true})).r.status,400);await sleep(600);const sample=attempt.snapshot.slice(0,18);const mistake=sample.slice(0,-1)+(sample.at(-1)==='X'?'Y':'X');x=await a('attempts/'+attempt.id+'/finish',{typed:mistake,strokes:18,wrong:2,wpm:99999});assert.equal(x.r.status,200,JSON.stringify(x.d));assert.equal(x.d.result.errors,1);const score=x.d.result.wpm;assert.equal((await a('attempts/'+attempt.id+'/finish',{typed:'fake',wpm:99999})).d.result.wpm,score);record('Finite timers, ownership checks, no pause and idempotent server scoring');
 assert.equal((await a('dashboard')).d.results.length,1);assert.equal((await b('dashboard')).d.results.length,0);record('Saved results stay private to their owner');
 let custom=(await a('attempts',{mode:'custom',text:'This is private custom practice content.',duration:30})).d.attempt;await a('attempts/'+custom.id+'/start',{});await a('attempts/'+custom.id+'/finish',{typed:'This is private',strokes:15,wrong:0});const stored=(await a('dashboard')).d.results.find(r=>r.id===custom.id);assert.equal(stored.snapshot,'[private text omitted]');assert.equal(stored.typed,'[private text omitted]');record('Custom content is removed from completed analytics');
 for(const endpoint of ['admin/access','admin/users','admin/features','admin/import','reports'])assert.equal((await a(endpoint,{})).r.status,404);const columns=(await db.prepare('PRAGMA table_info(sessions)').all()).results;assert.ok(!columns.some(v=>v.name==='admin'));record('No admin APIs, credentials or privileged session field');
 assert.equal((await a('profile',{name:'Bad origin'},'POST',{Origin:'https://attacker.invalid','X-Forwarded-Host':'attacker.invalid'})).r.status,403);assert.equal((await a('profile',{name:'Bad type'},'POST',{'Content-Type':'text/plain'})).r.status,415);assert.equal((await a('profile',{name:'x'.repeat(70000)})).r.status,413);assert.equal((await a('profile',[])).r.status,400);record('CSRF, spoofed forwarding header, body type/size and JSON validation');
 for(const route of ['/.env','/.git/config','/backups/users.sqlite','/content/seed.sql'])assert.equal((await mf.dispatchFetch('https://keyderby.test'+route)).status,404);assert.equal((await mf.dispatchFetch('https://keyderby.test/',{method:'POST',body:'malformed server action'})).status,405);record('Private file paths and unused server-action POST surface are blocked');
 assert.equal((await a('profile',{name:'Test Typist A',admin:true,role:'super_admin'})).d.user.admin,undefined);record('Injected role fields cannot create elevated access');
 const rid=(await a('rooms',{name:'Friends test',visibility:'public',duration:60,capacity:3,difficulty:'hard'})).d.id;
  assert.equal((await db.prepare('SELECT difficulty FROM rooms WHERE id=?').bind(rid).first()).difficulty,'easy','Friends first room must be Easy despite client input');
  const friendRoomIds=[rid];
  for(const expected of ['hard','medium','mixed']){
    const created=await a('rooms',{name:'Rotation '+expected,visibility:'private',duration:60,capacity:2,difficulty:'easy'});
    assert.equal(created.r.status,200,JSON.stringify(created.d));
    friendRoomIds.push(created.d.id);
    const actual=(await db.prepare('SELECT difficulty,passage_id FROM rooms WHERE id=?').bind(created.d.id).first());
    if(expected!=='mixed')assert.equal(actual.difficulty,expected,'Friends sequence difficulty '+expected);
  }
  assert.equal(new Set((await db.prepare("SELECT passage_id FROM rooms WHERE id IN ("+friendRoomIds.map(()=>'?').join(',')+")").bind(...friendRoomIds).all()).results.map(x=>x.passage_id)).size,4);
  assert.equal((await db.prepare("SELECT count(*) n FROM race_seen WHERE pool='friends_race' AND cycle=1").first()).n,4);
  record('Friends Race rotates Easy, Hard, Medium, Mixed without manual selection');
  await b('rooms/'+rid+'/join',{});let state=(await a('rooms/'+rid)).d;assert.equal(state.room.visibility,'private');assert.equal(state.room.duration,60);assert.equal((await db.prepare('SELECT pool FROM passages WHERE id=?').bind(state.room.passage_id).first()).pool,'friends_race');assert.equal((await a('rooms/'+rid+'/start',{})).r.status,400);await a('rooms/'+rid+'/ready',{ready:true});await b('rooms/'+rid+'/ready',{ready:true});await a('rooms/'+rid+'/start',{});state=(await a('rooms/'+rid)).d;assert.ok(state.room.start_at>Date.now());assert.equal((await b('rooms/'+rid+'/start',{})).r.status,403);record('Friends-only room creation, readiness, ownership and shared finite timer');
 await sleep(Math.max(0,state.room.start_at-Date.now()+500));const ra=(await a('attempts',{roomId:rid,mode:'race',duration:0})).d.attempt,rb=(await b('attempts',{roomId:rid,mode:'race'})).d.attempt;assert.equal(ra.snapshot,rb.snapshot);assert.equal(ra.duration,60);await a('attempts/'+ra.id+'/start',{});await b('attempts/'+rb.id+'/start',{});assert.equal((await a('rooms/'+rid+'/progress',{typed:ra.snapshot.slice(0,5)})).r.status,200);assert.ok((await b('rooms/'+rid)).d.players.find(p=>p.user_id===userA).progress>0);assert.equal((await a('attempts/'+ra.id+'/finish',{typed:'unfinished'})).r.status,400);record('Shared race passage, validated car progress and premature-finish rejection');
 // Move only this isolated fixture's server clock to a fixed deadline; no production timestamps are changed.
 const end=Date.now()-60500;await db.prepare('UPDATE rooms SET start_at=? WHERE id=?').bind(end,rid).run();await db.prepare('UPDATE attempts SET started=? WHERE room_id=?').bind(end,rid).run();assert.equal((await a('attempts/'+ra.id+'/finish',{typed:ra.snapshot.slice(0,160),strokes:160,wrong:0})).r.status,200);assert.equal((await b('attempts/'+rb.id+'/finish',{typed:rb.snapshot.slice(0,130),strokes:130,wrong:0})).r.status,200);state=(await a('rooms/'+rid)).d;assert.equal(state.room.state,'finished');assert.ok(state.players.every(p=>p.finished&&p.elapsed===60));record('Timer expiry saves partial race results and completes the race');
 let late=(await a('attempts',{passageId:first.id,mode:'test',duration:15})).d.attempt;await a('attempts/'+late.id+'/start',{});await db.prepare('UPDATE attempts SET started=? WHERE id=?').bind(Date.now()-14000,late.id).run();assert.equal((await a('attempts/'+late.id+'/progress',{typed:late.snapshot.slice(0,10)})).r.status,200);await db.prepare('UPDATE attempts SET started=? WHERE id=?').bind(Date.now()-18000,late.id).run();x=await a('attempts/'+late.id+'/finish',{typed:late.snapshot,strokes:1000,wrong:0});assert.equal(x.d.result.typed,late.snapshot.slice(0,10));assert.equal(x.d.result.elapsed,15);record('Late submissions cannot add text beyond the server deadline');
 const clients=[a,b,client(),client(),client(),client()];for(let i=2;i<clients.length;i++)await clients[i]('bootstrap');const queued=[];for(const person of clients){const q=await person('matchmaking',{});assert.equal(q.r.status,200,JSON.stringify(q.d));queued.push(q.d.id)}assert.ok(queued.slice(0,5).every(id=>id===queued[0]));assert.notEqual(queued[5],queued[0]);state=(await a('rooms/'+queued[0])).d;assert.equal(state.players.length,5);assert.equal(state.room.host,'system');assert.equal(state.room.duration,60);assert.equal(state.room.difficulty,'easy');assert.equal((await db.prepare('SELECT pool FROM passages WHERE id=?').bind(state.room.passage_id).first()).pool,'public_race');assert.equal(state.room.state,'racing');assert.ok(state.room.start_at>Date.now());assert.equal((await a('rooms/'+queued[0]+'/start',{})).r.status,403);assert.equal((await a('matchmaking',{})).d.id,queued[0]);record('One-click public matching, five-player capacity, automatic countdown and rejoin');
  const secondPublic=(await db.prepare('SELECT difficulty,passage_id FROM rooms WHERE id=?').bind(queued[5]).first());
  assert.equal(secondPublic.difficulty,'hard','Second public room should be Hard');
  await db.prepare("UPDATE rooms SET state='cancelled' WHERE id=?").bind(queued[5]).run();
  const p3=client();await p3('bootstrap');
  const thirdPublic=(await p3('matchmaking',{})).d.id;
  assert.equal((await db.prepare('SELECT difficulty FROM rooms WHERE id=?').bind(thirdPublic).first()).difficulty,'medium','Third public room should be Medium');
  await db.prepare("UPDATE rooms SET state='cancelled' WHERE id=?").bind(thirdPublic).run();
  const p4=client();await p4('bootstrap');
  const fourthPublic=(await p4('matchmaking',{})).d.id;
  assert.equal(new Set((await db.prepare("SELECT passage_id FROM rooms WHERE id IN (?,?,?,?)").bind(queued[0],queued[5],thirdPublic,fourthPublic).all()).results.map(x=>x.passage_id)).size,4);
  assert.equal((await db.prepare("SELECT count(*) n FROM race_seen WHERE pool='public_race' AND cycle=1").first()).n,4);
  record('Public Race rotates Easy, Hard, Medium, Mixed with four distinct shared-room passages');

 await a('settings',{visibility:'public',leaderboard:true,countryCode:'BD'});let timed=(await a('attempts',{passageId:first.id,mode:'test',duration:15})).d.attempt;await a('attempts/'+timed.id+'/start',{});await db.prepare('UPDATE attempts SET started=? WHERE id=?').bind(Date.now()-15500,timed.id).run();x=await a('attempts/'+timed.id+'/finish',{typed:timed.snapshot.slice(0,160),strokes:160,wrong:0});assert.equal(x.d.result.eligible,1);const worldwide=(await b('leaderboard?period=weekly&difficulty=easy&duration=15')).d;assert.equal(worldwide.maxRank,30);assert.equal(worldwide.entries.length,1);assert.equal(worldwide.entries[0].publicId,'KD-22301');assert.equal(worldwide.entries[0].countryCode,'BD');assert.ok(worldwide.entries[0].sessions>=1);assert.equal((await b('leaderboard?period=weekly&difficulty=easy&duration=15&mode=race')).d.entries.length,0);await a('settings',{visibility:'public',leaderboard:true,countryCode:'XX'});assert.equal((await a('profile')).d.user.settings.countryCode,'');await a('settings',{visibility:'private',leaderboard:false});assert.equal((await b('leaderboard?period=weekly&difficulty=easy&duration=15')).d.entries.length,0);record('Eligible scores compare like tests and respect immediate privacy opt-out');
 const cycleClient=client();
 const cycleUser=(await cycleClient('bootstrap')).d.user.id;
 const tail=(await cycleClient('practice/next',{difficulty:'mixed',requestKey:crypto.randomUUID()})).d;
 assert.equal(tail.used,1);
 await db.prepare(`INSERT OR IGNORE INTO practice_seen(user_id,cycle,passage_id,request_key,assigned_at)
     SELECT ?,1,p.id,'fixture:'||p.id,? FROM passages p WHERE p.pool='practice' AND p.status='published'`)
     .bind(cycleUser,Date.now()).run();
 assert.equal((await db.prepare('SELECT count(*) n FROM practice_seen WHERE user_id=? AND cycle=1').bind(cycleUser).first()).n,3200);
 const restarted=(await cycleClient('practice/next',{difficulty:'easy',requestKey:crypto.randomUUID()})).d;
 assert.equal(restarted.cycle,2,'A new cycle must start only when all 3,200 were assigned');
 assert.equal(restarted.used,1);
 assert.notEqual(restarted.passage.id,tail.passage.id,'Cycle boundary cannot repeat the previous passage');
 assert.equal((await db.prepare('SELECT count(*) n FROM practice_seen WHERE user_id=? AND cycle=1').bind(cycleUser).first()).n,3200);
 record('All 3,200 exhausted before cycle two, no boundary repeat, history intact');
 x=await a('profile');assert.equal(x.r.headers.get('cache-control'),'no-store');assert.equal(x.r.headers.get('x-content-type-options'),'nosniff');record('Private APIs use no-store and security response headers');
 fs.writeFileSync('docs/test-results.json',JSON.stringify({date:new Date().toISOString(),checks:checks.length,passed:checks},null,2));console.log('All '+checks.length+' integration checks passed.');
}finally{await mf.dispose()}
