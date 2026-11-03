import {db,one,query,run,token,limited} from './server';
import {assignRacePassage} from './race-rotation';
export const PUBLIC_RACE_SECONDS=60;
const JOIN_WINDOW_MS=12000;
const COUNTDOWN_MS=3500;
export async function advancePublicRaces(){
 const now=Date.now();
 await db().batch([
  db().prepare("DELETE FROM participants WHERE last_seen<? AND room_id IN(SELECT id FROM rooms WHERE visibility='public' AND state='waiting')").bind(now-30000),
  db().prepare("UPDATE rooms SET auto_start_at=NULL WHERE visibility='public' AND state='waiting' AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)<2"),
  db().prepare("UPDATE rooms SET state='cancelled' WHERE visibility='public' AND state='waiting' AND created<?").bind(now-120000),
  db().prepare("UPDATE rooms SET state='racing',start_at=auto_start_at WHERE visibility='public' AND state='waiting' AND auto_start_at IS NOT NULL AND auto_start_at<=? AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)>=2").bind(now+COUNTDOWN_MS)
 ]);
}
export async function joinPublicQueue(user:any){
 await limited('queue:'+user.id,15);await advancePublicRaces();
 const now=Date.now();
 const existing=await one("SELECT rooms.* FROM rooms JOIN participants ON participants.room_id=rooms.id WHERE participants.user_id=? AND rooms.visibility='public' AND rooms.expires>? AND (rooms.state='waiting' OR (rooms.state='racing' AND (rooms.start_at+rooms.duration*1000)>? AND participants.result_id IS NULL)) ORDER BY rooms.created DESC LIMIT 1",user.id,now,now);
 if(existing){await run('UPDATE participants SET last_seen=? WHERE room_id=? AND user_id=?',now,existing.id,user.id);return Response.json({id:existing.id,duration:existing.duration})}
 const available=await one("SELECT count(*) n FROM passages WHERE status='published' AND pool='public_race'");
 if(!Number(available?.n))return Response.json({error:'Practice content is still loading. Try again shortly.'},{status:503});
 for(let retry=0;retry<4;retry++){
  const id=token().slice(0,16).toUpperCase();
  // Reuse an open room before reserving a new passage; every participant shares the room passage.
  const open=await one("SELECT id FROM rooms WHERE visibility='public' AND state='waiting' AND expires>? AND (auto_start_at IS NULL OR auto_start_at>?) AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)<capacity ORDER BY created LIMIT 1",now,now+COUNTDOWN_MS);
  const passage=open?null:await assignRacePassage('public_race',id);
  // The conditional insert is one atomic SQL statement, so simultaneous arrivals share a pool.
  if(passage) {
    await run(`INSERT INTO rooms(id,host,name,visibility,difficulty,capacity,passage_id,duration,state,created,expires)
     SELECT ?,'system','Public race','public',?,5,?,?,'waiting',?,?
     WHERE NOT EXISTS(SELECT 1 FROM rooms WHERE visibility='public' AND state='waiting' AND expires>? AND (auto_start_at IS NULL OR auto_start_at>?) AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)<capacity)`,id,passage.difficulty,passage.id,PUBLIC_RACE_SECONDS,now,now+900000,now,now+COUNTDOWN_MS);
  }
  const room=await one("SELECT * FROM rooms WHERE visibility='public' AND state='waiting' AND expires>? AND (auto_start_at IS NULL OR auto_start_at>?) AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)<capacity ORDER BY created LIMIT 1",now,now+COUNTDOWN_MS);if(!room)continue;
  await run("INSERT OR IGNORE INTO participants(id,room_id,user_id,ready,last_seen) SELECT ?,?,?,1,? WHERE EXISTS(SELECT 1 FROM rooms WHERE id=? AND state='waiting' AND (auto_start_at IS NULL OR auto_start_at>?) AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)<capacity)",room.id+':'+user.id,room.id,user.id,now,room.id,now+COUNTDOWN_MS);
  const joined=await one('SELECT id FROM participants WHERE room_id=? AND user_id=?',room.id,user.id);if(!joined)continue;
  await run("UPDATE rooms SET auto_start_at=CASE WHEN (SELECT count(*) FROM participants WHERE room_id=rooms.id)>=capacity THEN MIN(COALESCE(auto_start_at,?),?) ELSE COALESCE(auto_start_at,?) END WHERE id=? AND state='waiting' AND (SELECT count(*) FROM participants WHERE room_id=rooms.id)>=2",now+COUNTDOWN_MS,now+COUNTDOWN_MS,now+JOIN_WINDOW_MS,room.id);
  await advancePublicRaces();return Response.json({id:room.id,duration:room.duration});
 }
 return Response.json({error:'The starting grid just filled. Please try Enter race again.'},{status:409});
}
