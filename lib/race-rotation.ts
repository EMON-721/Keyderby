import {one,run} from './server';

/**
 * Public and friends rooms each rotate through their own reserved corpus.
 * The order is Easy, Hard, Medium, Mixed; mixed draws any unseen text.
 * A room counts as seeing a passage when created; it never affects Practice.
 */
export async function assignRacePassage(pool:'public_race'|'friends_race',requestKey:string) {
  await run('INSERT OR IGNORE INTO race_cycles(pool,cycle,last_passage_id) VALUES(?,1,NULL)',pool);
  const prior=()=>one('SELECT passage_id,cycle FROM race_seen WHERE pool=? AND request_key=?',pool,requestKey);
  const claim=(preference:string)=>one(`INSERT INTO race_seen(pool,cycle,passage_id,request_key,assigned_at)
    SELECT ?,c.cycle,p.id,?,? FROM passages p JOIN race_cycles c ON c.pool=?
    WHERE p.status='published' AND p.pool=?
      AND (?='mixed' OR p.difficulty=?)
      AND NOT EXISTS (SELECT 1 FROM race_seen s WHERE s.pool=? AND s.cycle=c.cycle AND s.passage_id=p.id)
      AND (p.id<>COALESCE(c.last_passage_id,'') OR EXISTS
        (SELECT 1 FROM race_seen s WHERE s.pool=? AND s.cycle=c.cycle))
    ORDER BY RANDOM() LIMIT 1
    ON CONFLICT DO NOTHING RETURNING passage_id,cycle`,
    pool,requestKey,Date.now(),pool,pool,preference,preference,pool,pool);
  let assigned=await prior();
  if(!assigned){
    const row=await one('SELECT count(s.passage_id) n,c.rotation_base base FROM race_cycles c LEFT JOIN race_seen s ON s.pool=c.pool AND s.cycle=c.cycle WHERE c.pool=?',pool);
    const step=['easy','hard','medium','mixed'][Math.max(0,Number(row?.n||0)-Number(row?.base||0))%4];
    assigned=await claim(step);
    if(!assigned && step!=='mixed')assigned=await claim('mixed');
  }
  if(!assigned) {
    await run(`UPDATE race_cycles SET cycle=cycle+1,rotation_base=0 WHERE pool=?
      AND NOT EXISTS(
        SELECT 1 FROM passages p WHERE p.pool=? AND p.status='published'
        AND NOT EXISTS(SELECT 1 FROM race_seen s
          WHERE s.pool=? AND s.cycle=race_cycles.cycle AND s.passage_id=p.id)
      )`,pool,pool,pool);
    assigned=await prior() || await claim('easy') || await claim('mixed');
  }
  if(!assigned)throw new Error('No new race passage could be assigned. Try again.');
  const passage=await one("SELECT id,difficulty FROM passages WHERE id=? AND pool=? AND status='published'",assigned.passage_id,pool);
  if(!passage)throw new Error('The assigned race passage is unavailable.');
  const latest=await one('SELECT passage_id FROM race_seen WHERE pool=? AND cycle=? ORDER BY assigned_at DESC,rowid DESC LIMIT 1',pool,assigned.cycle);
  if(latest?.passage_id===passage.id)
    await run('UPDATE race_cycles SET last_passage_id=? WHERE pool=? AND cycle=?',passage.id,pool,assigned.cycle);
  return {...passage,cycle:assigned.cycle};
}
