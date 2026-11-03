import {one,run} from './server';
import {metadata} from './content';
import {labelFor} from './passage-labels';

/**
 * Assign a new, non-repeating passage to one authenticated session owner.
 * The assigned passage is counted even if the visitor leaves without typing.
 * A given user/requestKey is idempotent. Difficulty rotates automatically:
 * Easy -> Hard -> Medium -> Mixed, with fallback only when that level is exhausted.
 */
export async function assignPractice(userId:string, requestKey:string) {
    await run('INSERT OR IGNORE INTO practice_cycles(user_id,cycle,last_passage_id) VALUES(?,1,NULL)',userId);
    async function prior() {
        return one('SELECT passage_id,cycle FROM practice_seen WHERE user_id=? AND request_key=?',userId,requestKey);
    }
    async function claim(preferred:string) {
        // Single SQLite write statement picks an unassigned passage and records the reservation.
        // The UNIQUE indexes prevent repeated assignment under concurrent API requests.
        return one(`INSERT INTO practice_seen(user_id,cycle,passage_id,request_key,assigned_at)
            SELECT ?,c.cycle,p.id,?,?
            FROM passages p JOIN practice_cycles c ON c.user_id=?
            WHERE p.status='published' AND p.pool='practice'
              AND (?='mixed' OR p.difficulty=?)
              AND NOT EXISTS(SELECT 1 FROM practice_seen seen
                  WHERE seen.user_id=? AND seen.cycle=c.cycle AND seen.passage_id=p.id)
              AND (p.id<>COALESCE(c.last_passage_id,'') OR EXISTS(
                  SELECT 1 FROM practice_seen any_seen
                  WHERE any_seen.user_id=? AND any_seen.cycle=c.cycle))
            ORDER BY RANDOM() LIMIT 1
            ON CONFLICT DO NOTHING RETURNING passage_id,cycle`,
            userId,requestKey,Date.now(),userId,preferred,preferred,userId,userId);
    }
    let assigned=await prior();
    if (!assigned) {
        const count = await one(`SELECT count(*) n,c.rotation_base base FROM practice_cycles c
            LEFT JOIN practice_seen s ON s.user_id=c.user_id AND s.cycle=c.cycle WHERE c.user_id=?`,userId);
        const order = ['easy','hard','medium','mixed'] as const;
        const preferred = order[Math.max(0,Number(count?.n||0)-Number(count?.base||0))%4];
        assigned = await claim(preferred);
        if (!assigned && preferred!=='mixed') assigned=await claim('mixed');
    }
    if (!assigned) {
        // Only advance a cycle if every Practice passage was assigned.
        await run(`UPDATE practice_cycles SET cycle=cycle+1,rotation_base=0
            WHERE user_id=? AND NOT EXISTS (
                SELECT 1 FROM passages p WHERE p.status='published' AND p.pool='practice'
                AND NOT EXISTS(
                    SELECT 1 FROM practice_seen seen
                    WHERE seen.user_id=? AND seen.cycle=practice_cycles.cycle AND seen.passage_id=p.id
                )
            )`,userId,userId);
        assigned=await prior() || await claim('easy') || await claim('mixed');
    }
    if (!assigned) throw new Error('Could not assign the next practice passage. Please retry.');
    const passage=await one("SELECT * FROM passages WHERE id=? AND status='published' AND pool='practice'",assigned.passage_id);
    if (!passage) throw new Error('Assigned passage is no longer available.');
    // A duplicate request must not rewrite the actual most-recent passage pointer.
    const priorLatest=await one('SELECT last_passage_id FROM practice_cycles WHERE user_id=?',userId);
    if (priorLatest?.last_passage_id!==assigned.passage_id) {
        const latest=await one('SELECT passage_id FROM practice_seen WHERE user_id=? AND cycle=? ORDER BY assigned_at DESC, rowid DESC LIMIT 1',userId,assigned.cycle);
        if (latest?.passage_id===assigned.passage_id)
            await run('UPDATE practice_cycles SET last_passage_id=? WHERE user_id=? AND cycle=?',assigned.passage_id,userId,assigned.cycle);
    }
    const stats=await one(`SELECT c.cycle,(SELECT count(*) FROM practice_seen s WHERE s.user_id=c.user_id AND s.cycle=c.cycle) used,
      (SELECT count(*) FROM passages p WHERE p.status='published' AND p.pool='practice') total
      FROM practice_cycles c WHERE c.user_id=?`,userId);
    return {passage:{...passage,...metadata(passage),...labelFor(passage.id)},
      cycle:assigned.cycle,used:Number(stats.used),total:Number(stats.total),
      remaining:Math.max(0,Number(stats.total)-Number(stats.used))};
}
