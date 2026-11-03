import { auth, db, query, one, run, uid, hash, token, newSession, limited, publicUser } from '../../../lib/server';
import {advancePublicRaces,joinPublicQueue} from '../../../lib/racing';
import {assignRacePassage} from '../../../lib/race-rotation';
import {ensureCorpus} from '../../../lib/corpus';
import {assignPractice} from '../../../lib/practice-rotation';
import {readJson,validateOrigin,HttpFailure,secureResponse} from '../../../lib/http-security';
import {labelFor} from '../../../lib/passage-labels';
import { metadata } from '../../../lib/content';
import { score, chars, badges } from '../../../lib/scoring';
import { isCountryCode } from '../../../lib/countries';
export const dynamic = 'force-dynamic';
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });
const clean = (x: any, n = 100) => String(x ?? '').trim().slice(0, n);
const settingsAllowed = (s: any) => ({ theme: ['light', 'dark'].includes(s.theme) ? s.theme : 'light', font: ['mono', 'sans', 'serif'].includes(s.font) ? s.font : 'mono', fontSize: Math.max(16, Math.min(36, Number(s.fontSize) || 23)), lineHeight: Math.max(1.4, Math.min(2.5, Number(s.lineHeight) || 1.9)), visibility: ['public', 'private'].includes(s.visibility) ? s.visibility : 'private', sound: !!s.sound, animation: s.animation !== false, strict: !!s.strict, noBackspace: !!s.noBackspace, leaderboard: !!s.leaderboard, countryCode: isCountryCode(s.countryCode) ? s.countryCode : '', country: typeof s.country === 'string' && /^[\p{L}\p{M} .'-]{2,56}$/u.test(s.country.trim()) ? s.country.trim() : '', track: ['City Highway', 'Mountain Pass', 'Midnight Run', 'Desert Road'].includes(s.track) ? s.track : 'City Highway' });
const cookie = (t: string, req: Request) => `kd_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
const withPassageLabel=(value:any)=>({...value,...labelFor(value.passage_id)});
async function passageDetails(id:string){const p=await one('SELECT * FROM passages WHERE id=?',id);return p?{...p,...metadata(p)}:null}
async function handler(req: Request) {
    const url = new URL(req.url), p = url.pathname.replace('/api/', '').split('/'), method = req.method;
    let u = await auth(req);
    if(method!=='GET')validateOrigin(req);
    const body:any=method==='GET'?{}:await readJson(req);
    await limited('ip:' + await hash(req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'local'), 1500);
    if (u) await run('UPDATE users SET last_active=? WHERE id=? AND last_active<?', Date.now(), u.id, Date.now() - 30000);
    if (p[0] === 'bootstrap') {
        if(method!=='GET')return fail('Method not allowed.',405);
        await ensureCorpus();
        let sessionToken = '';
        if (!u) {
            await limited('guest-create:' + await hash(req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || 'local'), 15);
            const id = 'KD-' + token().slice(0, 12).toUpperCase();
            await run('INSERT INTO users(id,name,created,settings,guest) VALUES(?,?,?,?,1)', id, 'Guest driver', Date.now(), JSON.stringify(settingsAllowed({})));
            // Allocate a readable public label, not an authentication credential.
            // Autoincrement allocation is atomic even across concurrent Workers.
            const row = await one('INSERT INTO driver_numbers(user_id) VALUES(?) RETURNING number', id);
            await run('UPDATE users SET public_id=? WHERE id=?', 'KD-' + String(22300 + Number(row.number)).padStart(5, '0'), id);
            sessionToken = await newSession(id);
            u = await one('SELECT * FROM users WHERE id=?', id);
        }
        return Response.json({ user: publicUser(u), passageCount: (await one("SELECT count(*) n FROM passages WHERE status='published'")).n, serverDate: new Date().toISOString().slice(0, 10) }, { headers: sessionToken ? { 'Set-Cookie': cookie(sessionToken, req) } : {} });
    }
    if (p[0] === 'recover' && method === 'POST') {
        await limited('recovery:' + await hash(req.headers.get('cf-connecting-ip') || 'local'), 5);
        const code = clean(body.code, 100).replace(/\s/g, '');
        const target = await one('SELECT * FROM users WHERE recovery=? AND status=?', await hash(code), 'active');
        if (!target)
            return fail('That recovery code is invalid. Check the saved code and try again.');
        const t = await newSession(target.id);
        return Response.json({ user: publicUser(target) }, { headers: { 'Set-Cookie': cookie(t, req) } });
    }
    if (!u)
        return fail('Your session expired. Refresh to start again.', 401);
    await limited('user:' + u.id, 180);
    if (p[0] === 'presence') {
        if (method !== 'GET') return fail('Method not allowed.', 405);
        return Response.json({ ok: true });
    }
    if (p[0] === 'profile') {
        if (method === 'GET')
            return Response.json({ user: publicUser(u) });
        if (method === 'DELETE') {
            await db().batch([db().prepare("UPDATE users SET status='deleted',name='Deleted driver',username=NULL,recovery=NULL,settings='{}' WHERE id=?").bind(u.id), db().prepare('DELETE FROM sessions WHERE user_id=?').bind(u.id), db().prepare('DELETE FROM attempts WHERE user_id=?').bind(u.id), db().prepare('DELETE FROM goals WHERE user_id=?').bind(u.id),db().prepare('DELETE FROM practice_seen WHERE user_id=?').bind(u.id),db().prepare('DELETE FROM practice_cycles WHERE user_id=?').bind(u.id)]);
            return Response.json({ ok: true }, { headers: { 'Set-Cookie': 'kd_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' } });
        }
        const name = clean(body.name, 40);
        if (!name || name.length < 2)
            return fail('Use a display name with at least 2 characters.');
        const username = u.username || (name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'driver') + '_' + u.id.slice(-8).toLowerCase();
        let recoveryCode: string | undefined;
        if (u.guest || body.rotateRecovery) {
            recoveryCode = 'KD-' + token().slice(0, 32);
            await run('UPDATE users SET recovery=? WHERE id=?', await hash(recoveryCode), u.id);
        }
        await run('UPDATE users SET name=?,username=?,settings=?,guest=0 WHERE id=?', name, username || null, JSON.stringify(settingsAllowed(body.settings || JSON.parse(u.settings || '{}'))), u.id);
        const t = await newSession(u.id);
        const old = (req.headers.get('cookie') || '').match(/kd_session=([^;]+)/)?.[1];
        if (old)
            await run('DELETE FROM sessions WHERE token=?', await hash(old));
        return Response.json({ user: publicUser(await one('SELECT * FROM users WHERE id=?', u.id)), recoveryCode }, { headers: { 'Set-Cookie': cookie(t, req) } });
    }
    if (p[0] === 'settings' && method === 'POST') {
        const s = settingsAllowed(body);
        await run('UPDATE users SET settings=? WHERE id=?', JSON.stringify(s), u.id);
        return Response.json(s);
    }
    if (p[0] === 'practice' && p[1] === 'next') {
        if (method !== 'POST') return fail('Method not allowed.',405);
        const requestKey=clean(body.requestKey,50);
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey))
            return fail('Missing valid passage request identifier.');
        await limited('practice-next:'+u.id,45);
        return Response.json(await assignPractice(u.id,requestKey));
    }
    if (p[0] === 'passages') {
        if(method!=='GET')return fail('Method not allowed.',405);
        // Complete paginated 3,200-passage Practice catalog. Race-only pools are excluded.
        // Pagination prevents payload limits and keeps the 4,000 item dropdown searchable.
        if (p[1] === 'options') {
            const requestedDifficulty = url.searchParams.get('difficulty') || 'mixed';
            if (!['easy','medium','hard','mixed'].includes(requestedDifficulty)) return fail('Invalid difficulty.');
            const where = requestedDifficulty === 'mixed' ? "status='published' AND pool='practice'" : "status='published' AND pool='practice' AND difficulty=?";
            const filters = requestedDifficulty === 'mixed' ? [] : [requestedDifficulty];
            const offset = Math.max(0, Math.min(100000, Math.floor(Number(url.searchParams.get('offset')) || 0)));
            const limit = Math.max(1, Math.min(500, Math.floor(Number(url.searchParams.get('limit')) || 500)));
            const rows = await query('SELECT id,title,difficulty,category,words FROM passages WHERE ' + where + ' ORDER BY CASE difficulty WHEN \'easy\' THEN 0 WHEN \'medium\' THEN 1 ELSE 2 END, id LIMIT ? OFFSET ?', ...filters, limit, offset);
            const total = Number((await one('SELECT count(*) n FROM passages WHERE ' + where, ...filters)).n);
            return Response.json({ passages: rows.map(p => ({ ...p, ...labelFor(p.id) })), total, offset, limit });
        }
        if(p[1]){const passage=await one("SELECT * FROM passages WHERE id=? AND status='published'",clean(p[1]));return passage?Response.json({...passage,...metadata(passage)}):fail('Passage not found.',404)}
        const limit = Math.max(1, Math.min(50, Number(url.searchParams.get('limit')) || 20));
        const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
        let where = "status='published' AND pool='practice'", args: any[] = [];
        const difficulty = url.searchParams.get('difficulty'), category = url.searchParams.get('category'), search = url.searchParams.get('search');
        if (difficulty && difficulty !== 'mixed' && difficulty !== 'adaptive') {
            where += ' AND difficulty=?';
            args.push(difficulty);
        }
        if (category) {
            where += ' AND category=?';
            args.push(category);
        }
        if (search) {
            where += ' AND (title LIKE ? OR text LIKE ?)';
            args.push('%' + search.slice(0, 80) + '%', '%' + search.slice(0, 80) + '%');
        }
        return Response.json({ passages: (await query('SELECT * FROM passages WHERE ' + where + (url.searchParams.get('random')==='1'?" ORDER BY RANDOM() LIMIT ? OFFSET ?":" ORDER BY CASE WHEN id LIKE 'KD-%' THEN 0 ELSE 1 END,id LIMIT ? OFFSET ?"), ...args, limit, offset)).map(p => ({ ...p, ...metadata(p) })), total: (await one('SELECT count(*) n FROM passages WHERE ' + where, ...args)).n, categories: (await query("SELECT DISTINCT category FROM passages WHERE status='published'")).map(r => r.category) });
    }
    if (p[0] === 'attempts') {
        if (method === 'POST' && !p[1]) {
            const mode = ['practice', 'test', 'punctuation', 'numbers', 'challenge', 'custom', 'race', 'mistakes'].includes(body.mode) ? body.mode : 'practice';
            let passage = body.passageId ? await one("SELECT * FROM passages WHERE id=? AND status='published'", body.passageId) : null;
            if (passage && ['practice','test','challenge'].includes(mode) && passage.pool !== 'practice')
                return fail('This passage belongs to Race, not Practice.');
            if (mode==='practice') {
                if (!passage) return fail('Your next Practice passage is assigned automatically. Refresh Practice to continue.');
                const current = await one('SELECT c.last_passage_id FROM practice_cycles c WHERE c.user_id=?',u.id);
                const assigned = await one('SELECT 1 ok FROM practice_seen s JOIN practice_cycles c ON c.user_id=s.user_id AND c.cycle=s.cycle WHERE s.user_id=? AND s.passage_id=? AND s.request_key NOT LIKE ? LIMIT 1',u.id,passage.id,'legacy:%');
                if (!current || current.last_passage_id!==passage.id || !assigned)
                    return fail('Practice uses your next automatically assigned passage. Manual selection is disabled.');
            }
            if (body.roomId && mode !== 'race') return fail('Only Race attempts may use a race room.',403);
            if (mode === 'race' && !body.roomId)
                return fail('A real race room is required to use Race passages.',403);
            const duration = [15, 30, 60, 120, 300].includes(Number(body.duration)) ? Number(body.duration) : 60;
            let room = null;
            if (body.roomId) {
                room = await one('SELECT * FROM rooms WHERE id=?', body.roomId);
                const member = await one('SELECT * FROM participants WHERE room_id=? AND user_id=?', body.roomId, u.id);
                if (!room || !member || room.state === 'cancelled' || !room.start_at || Date.now() < room.start_at)
                    return fail('The race has not started.');
                const existing = await one('SELECT * FROM attempts WHERE room_id=? AND user_id=?', room.id, u.id);
                if (existing)
                    return Response.json({ attempt: withPassageLabel(existing) });
                passage = await one('SELECT * FROM passages WHERE id=?', room.passage_id);
            }
            if (mode === 'challenge') {
                const diff = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : 'easy';
                const list = await query("SELECT * FROM passages WHERE difficulty=? AND status='published' AND pool='practice' ORDER BY id", diff);
                passage = list[Math.floor(Date.now() / 86400000) % list.length];
            }
            let text = passage?.text, title = passage?.title || 'Custom practice';
            if (mode === 'custom') {
                text = clean(body.text, 10000);
                title = 'Private custom text';
            }
            if (['numbers', 'punctuation', 'mistakes'].includes(mode)) {
                const sets: any = { punctuation: 'Wait, listen. "Is it ready?" Yes! (Check twice); then: start. Time to go.', numbers: '8:30 42 17.5 100% $24.99 2026 3+7=10 9/12 1,024 0.75 64%' };
                let words = String(sets[mode] || '').split(' ');
                if (mode === 'mistakes') {
                    const rs = await query('SELECT snapshot,typed FROM attempts WHERE user_id=? AND finished IS NOT NULL ORDER BY finished DESC LIMIT 20', u.id);
                    words = [];
                    rs.forEach(r => {
                        r.snapshot.split(' ').forEach((w: string, i: number) => {
                            if (r.typed?.split(' ')[i] && w !== r.typed.split(' ')[i])
                                words.push(w);
                        });
                    });
                    words = [...new Set(words)].slice(0, 50);
                    if (!words.length)
                        return fail('No saved word mistakes yet. Complete a practice session first.');
                }
                text = Array.from({ length: mode === 'punctuation' ? 4 : 4 }, () => words.join(' ')).join(' ');
                title = mode === 'mistakes' ? 'Your mistake practice' : mode === 'numbers' ? 'Numbers & symbols' : 'Punctuation pit stop';
            }
            if (!text)
                return fail('Choose a passage to begin.');
            if (duration && mode !== 'custom' && !room) {
                const original = text;
                while (text.length < duration * 30)
                    text += ' ' + original;
            }
            const active = await one('SELECT id FROM attempts WHERE user_id=? AND finished IS NULL AND started IS NOT NULL AND started>?', u.id, Date.now() - 600000);
            if (active)
                return Response.json({ error: 'There is an unfinished typing session on your profile.', activeAttemptId: active.id }, { status: 409 });
            const id = uid();
            await run('INSERT INTO attempts(id,user_id,passage_id,snapshot,title,difficulty,mode,duration,room_id) VALUES(?,?,?,?,?,?,?,?,?)', id, u.id, passage?.id || null, text, title, passage?.difficulty || body.difficulty || 'easy', mode, room ? room.duration : duration, room?.id || null);
            return Response.json({ attempt: withPassageLabel(await one('SELECT * FROM attempts WHERE id=?', id)) });
        }
        const a = await one('SELECT * FROM attempts WHERE id=? AND user_id=?', p[1], u.id);
        if (!a)
            return fail('Practice session not found.', 404);
        if (p[2] === 'start' && method === 'POST') {
            if (a.finished)
                return fail('Session already ended.');
            if (a.started)
                return Response.json({ started: a.started });
            let started = Date.now();
            if (a.room_id) {
                const room = await one('SELECT start_at,state FROM rooms WHERE id=?', a.room_id);
                if (!room || room.state === 'cancelled' || started < room.start_at)
                    return fail('Wait for the race countdown.');
                started = room.start_at;
            }
            await run('UPDATE attempts SET started=? WHERE id=? AND started IS NULL', started, a.id);
            return Response.json({ started });
        }
        if(p[2]==='progress'&&method==='POST'){
            if(!a.started||a.finished)return fail('No active typing session.',400);
            if(Date.now()>a.started+a.duration*1000)return Response.json({closed:true});
            const current=String(body.typed||'').slice(0,chars(a.snapshot).length);
            const sc=score(a.snapshot,current,Math.max(.1,(Date.now()-a.started)/1000));
            if(sc.raw>300)return fail('Progress is too fast to verify.',400);
            await run('UPDATE attempts SET typed=? WHERE id=? AND finished IS NULL',current,a.id);
            return Response.json({ok:true});
        }
        if(p[2]==='pause')return fail('Timed sessions cannot be paused.',400);
        if (p[2] === 'finish' && method === 'POST') {
            if (a.finished)
                return Response.json({ result: withPassageLabel(a) });
            if (!a.started)
                return fail('Start typing before saving a result.');
            const elapsed = Math.max(.01, ((a.paused_at || Date.now()) - a.started) / 1000);
            const typed = String(elapsed>a.duration+1?(a.typed||''):(body.typed??'')).slice(0,chars(a.snapshot).length);
            const count = chars(typed).length;
            const strokes = Math.max(count, Math.min(100000, Number(body.strokes) || count)), wrong = Math.max(0, Math.min(strokes, Number(body.wrong) || 0));
            const seconds = a.duration ? Math.min(elapsed, a.duration) : elapsed;
            const s = score(a.snapshot, typed, seconds, strokes, wrong);
            const timedOut=elapsed>=a.duration-.25;
            if(a.room_id&&!timedOut&&typed!==a.snapshot)return fail('Complete the passage exactly or wait for the timer.',400);
            if(a.room_id&&s.raw>300)return fail('This race speed could not be verified.',400);
            const settings = JSON.parse(u.settings || '{}');
            const eligible = (!u.guest && settings.leaderboard && settings.visibility === 'public' && count >= 150 && seconds >= 15 && s.accuracy >= 90 && s.raw <= 300 && ['practice', 'test', 'race', 'challenge'].includes(a.mode) && !settings.noBackspace && !settings.strict && (!a.duration || elapsed >= a.duration - .5)) ? 1 : 0;
            await run('UPDATE attempts SET finished=?,typed=?,wpm=?,raw=?,accuracy=?,first_accuracy=?,errors=?,corrected=?,elapsed=?,eligible=?,mistakes=? WHERE id=? AND finished IS NULL', Date.now(), a.mode === 'custom' ? '[private text omitted]' : typed, s.wpm, s.raw, s.accuracy, s.firstAccuracy, s.errors, s.corrected, seconds, eligible, JSON.stringify(a.mode === 'custom' ? [] : s.mistakes), a.id);
            if (a.mode === 'custom')
                await run("UPDATE attempts SET snapshot='[private text omitted]' WHERE id=?", a.id);
            if (a.room_id) {
                await run('UPDATE participants SET progress=?,result_id=?,last_seen=? WHERE room_id=? AND user_id=?', s.completion, a.id, Date.now(), a.room_id, u.id);
                const pending = await one('SELECT count(*) n FROM participants WHERE room_id=? AND result_id IS NULL AND last_seen>?', a.room_id, Date.now() - 30000);
                if (!pending.n)
                    await run("UPDATE rooms SET state='finished' WHERE id=?", a.room_id);
            }
            return Response.json({ result: withPassageLabel(await one('SELECT * FROM attempts WHERE id=?', a.id)) });
        }
        if (p[2] === 'cancel' && method === 'POST') {
            await run('DELETE FROM attempts WHERE id=? AND user_id=? AND finished IS NULL', a.id, u.id);
            return Response.json({ ok: true });
        }
    }
    if (p[0] === 'dashboard' || p[0] === 'export') {
        const results = await query('SELECT * FROM attempts WHERE user_id=? AND finished IS NOT NULL ORDER BY finished DESC LIMIT 500', u.id);
        const g = await query('SELECT * FROM goals WHERE user_id=?', u.id);
        return Response.json({ user: publicUser(u), results:results.map(withPassageLabel), goals: g, badges: badges(results) });
    }
    if (p[0] === 'goals') {
        if (method === 'GET')
            return Response.json(await query('SELECT * FROM goals WHERE user_id=?', u.id));
        if (method === 'DELETE') {
            await run('DELETE FROM goals WHERE id=? AND user_id=?', clean(body.id), u.id);
            return Response.json({ ok: true });
        }
        const kind = ['wpm', 'sessions', 'minutes', 'accuracy'].includes(body.kind) ? body.kind : 'wpm';
        const target = Math.max(1, Math.min(10000, Number(body.target) || 40));
        await run('INSERT INTO goals(id,user_id,kind,target,created) VALUES(?,?,?,?,?)', uid(), u.id, kind, target, Date.now());
        return Response.json({ ok: true });
    }
    if (p[0] === 'leaderboard') {
        if (method !== 'GET') return fail('Method not allowed.', 405);
        const period = ['daily', 'weekly', 'monthly', 'all'].includes(url.searchParams.get('period') || '') ? url.searchParams.get('period')! : 'all';
        const since = period === 'daily' ? Date.now() - 86400000 : period === 'weekly' ? Date.now() - 7 * 86400000 : period === 'monthly' ? Date.now() - 30 * 86400000 : 0;
        const difficulty = ['easy', 'medium', 'hard'].includes(url.searchParams.get('difficulty') || '') ? url.searchParams.get('difficulty')! : 'easy';
        const duration = [15, 30, 60, 120, 300].includes(Number(url.searchParams.get('duration'))) ? Number(url.searchParams.get('duration')) : 60;
        const mode = ['all', 'practice', 'test', 'race'].includes(url.searchParams.get('mode') || '') ? url.searchParams.get('mode')! : 'all';
        const cutoff = Date.now() - 120000;
        const publicFilter = "users.status='active' AND users.guest=0 AND json_extract(users.settings,'$.leaderboard')=1 AND json_extract(users.settings,'$.visibility')='public'";
        const entries = await query(
          `SELECT users.public_id publicId, users.name, CASE WHEN json_valid(users.settings) THEN json_extract(users.settings,'$.country') ELSE NULL END country, CASE WHEN json_valid(users.settings) THEN json_extract(users.settings,'$.countryCode') ELSE NULL END countryCode,
            MAX(a.wpm) wpm, AVG(a.accuracy) accuracy, COUNT(*) qualifying_sessions,
            (SELECT COUNT(*) FROM attempts activity WHERE activity.user_id=users.id AND activity.finished IS NOT NULL AND activity.mode IN ('practice','test','race')) sessions,
            (SELECT COALESCE(ROUND(SUM(activity.elapsed)/60.0,1),0) FROM attempts activity WHERE activity.user_id=users.id AND activity.finished IS NOT NULL AND activity.mode IN ('practice','test','race')) minutes,
            CASE WHEN users.last_active>? THEN 1 ELSE 0 END online
          FROM attempts a JOIN users ON users.id=a.user_id
          WHERE a.eligible=1 AND ${publicFilter} AND a.finished>? AND a.difficulty=? AND a.duration=?
            AND a.mode IN ('practice','test','race') AND (?='all' OR a.mode=?)
          GROUP BY users.id ORDER BY wpm DESC, accuracy DESC, sessions DESC LIMIT 30`,
          cutoff, since, difficulty, duration, mode, mode);
        const onlineUsers = await query(
          `SELECT users.public_id publicId, users.name, CASE WHEN json_valid(users.settings) THEN json_extract(users.settings,'$.country') ELSE NULL END country, CASE WHEN json_valid(users.settings) THEN json_extract(users.settings,'$.countryCode') ELSE NULL END countryCode
           FROM users WHERE ${publicFilter} AND users.last_active>? ORDER BY users.last_active DESC LIMIT 30`, cutoff);
        return Response.json({ entries, onlineUsers, onlineCount: (await one(
          `SELECT count(*) n FROM users WHERE ${publicFilter} AND users.last_active>?`, cutoff)).n,
          period, difficulty, duration, mode, maxRank: 30, onlineWindowSeconds: 120 });
    }
    if(p[0]==='matchmaking'){
      if(method!=='POST')return fail('Method not allowed.',405);
      return joinPublicQueue(u);
    }
    if (p[0] === 'rooms') {
        if (!p[1] && method === 'GET')
            return Response.json({ rooms: await query("SELECT rooms.*,count(participants.id) members FROM rooms LEFT JOIN participants ON participants.room_id=rooms.id AND participants.last_seen>? WHERE rooms.visibility='public' AND rooms.state='waiting' AND rooms.expires>? GROUP BY rooms.id ORDER BY rooms.created DESC LIMIT 30", Date.now() - 30000, Date.now()) });
        if (!p[1] && method === 'POST') {
            await limited('create-room:' + u.id, 5);
            const id = token().slice(0, 16).toUpperCase();
            const passage = await assignRacePassage('friends_race', id);
            await db().batch([db().prepare('INSERT INTO rooms(id,host,name,visibility,difficulty,capacity,passage_id,duration,created,expires) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id, u.id, clean(body.name, 60) || 'A friendly derby', 'private', passage.difficulty, Math.max(2, Math.min(6, Number(body.capacity) || 4)), passage.id, [15,30,60,120,300].includes(Number(body.duration))?Number(body.duration):60, Date.now(), Date.now() + 1800000), db().prepare('INSERT INTO participants(id,room_id,user_id,last_seen) VALUES(?,?,?,?)').bind(id + ':' + u.id, id, u.id, Date.now())]);
            return Response.json({ id });
        }
        await advancePublicRaces();
        const room = await one('SELECT * FROM rooms WHERE id=?', clean(p[1], 32));
        if (!room || room.expires < Date.now())
            return fail('This room is unavailable or has expired.', 404);
        const member = await one('SELECT * FROM participants WHERE room_id=? AND user_id=?', room.id, u.id);
        if (p[2] === 'join' && method === 'POST') {
            if(room.visibility==='public'&&!member)return fail('Use Enter race to join the public queue.',403);
            if (room.state !== 'waiting' && !member)
                return fail('This race has already started.');
            if (!member) {
                await run('INSERT INTO participants(id,room_id,user_id,last_seen) SELECT ?,?,?,? WHERE (SELECT count(*) FROM participants WHERE room_id=?)<?', room.id + ':' + u.id, room.id, u.id, Date.now(), room.id, room.capacity);
                if (!await one('SELECT * FROM participants WHERE room_id=? AND user_id=?', room.id, u.id))
                    return fail('This room is full.');
            }
            else
                await run('UPDATE participants SET last_seen=? WHERE id=?', Date.now(), member.id);
            return Response.json({ ok: true });
        }
        if (!member)
            return fail('Join this room with its invite code first.', 403);
        if (p[2] === 'ready' && method === 'POST') {
            if (room.state !== 'waiting')
                return fail('The race has started.');
            await run('UPDATE participants SET ready=?,last_seen=? WHERE id=?', body.ready ? 1 : 0, Date.now(), member.id);
            return Response.json({ ok: true });
        }
        if(['start','cancel','kick'].includes(p[2])&&room.visibility==='public')return fail('Public races are managed automatically.',403);
        if (p[2] === 'start' && method === 'POST') {
            if (room.host !== u.id)
                return fail('Only the host can start this race.', 403);
            const players = await query('SELECT * FROM participants WHERE room_id=? AND last_seen>?', room.id, Date.now() - 30000);
            if (players.length < 2 || players.some(x => !x.ready))
                return fail('At least two connected drivers must be ready.');
            await run("UPDATE rooms SET state='racing',start_at=? WHERE id=? AND state='waiting'", Date.now() + 3500, room.id);
            return Response.json({ ok: true });
        }
        if (p[2] === 'cancel' && method === 'POST') {
            if (room.host !== u.id)
                return fail('Only the host can close this room.', 403);
            await run("UPDATE rooms SET state='cancelled' WHERE id=?", room.id);
            return Response.json({ ok: true });
        }
        if (p[2] === 'kick' && method === 'POST') {
            if (room.host !== u.id || room.state !== 'waiting' || body.userId === u.id)
                return fail('This driver cannot be removed.', 403);
            await run('DELETE FROM participants WHERE room_id=? AND user_id=?', room.id, clean(body.userId));
            return Response.json({ ok: true });
        }
        if (p[2] === 'leave' && method === 'POST') {
            if (room.visibility==='private'&&room.host === u.id)
                await run("UPDATE rooms SET state='cancelled' WHERE id=?", room.id);
            else
                await run('DELETE FROM participants WHERE id=?', member.id);
            return Response.json({ ok: true });
        }
        if (p[2] === 'progress' && method === 'POST') {
            if (room.state !== 'racing' || !room.start_at || Date.now() < room.start_at)
                return fail('Race is not running.');
            const a = await one('SELECT * FROM attempts WHERE room_id=? AND user_id=?', room.id, u.id);
            if (!a || a.finished)
                return fail('No active race attempt.');
            if(Date.now()>room.start_at+room.duration*1000)return Response.json({closed:true});
            const typed = String(body.typed || '').slice(0, a.snapshot.length);
            const sc = score(a.snapshot, typed, Math.max(.1, (Date.now() - room.start_at) / 1000));
            if (sc.raw > 300)
                return fail('Progress is too fast to verify.');
            const correctPrefix = chars(typed).findIndex((c, i) => c !== chars(a.snapshot)[i]);
            const progress = (correctPrefix < 0 ? chars(typed).length : correctPrefix) / chars(a.snapshot).length * 100;
            await db().batch([db().prepare('UPDATE participants SET progress=?,last_seen=? WHERE id=?').bind(progress,Date.now(),member.id),db().prepare('UPDATE attempts SET typed=? WHERE id=? AND finished IS NULL').bind(typed,a.id)]);
            return Response.json({ ok: true });
        }
        if (method === 'GET') {
            await run('UPDATE participants SET last_seen=? WHERE id=?', Date.now(), member.id);
            const players = await query('SELECT participants.*,users.name,attempts.wpm,attempts.accuracy,attempts.elapsed,attempts.finished FROM participants JOIN users ON users.id=participants.user_id LEFT JOIN attempts ON attempts.id=participants.result_id WHERE participants.room_id=?', room.id);
            if (room.state === 'racing' && Date.now() - (room.start_at || Date.now()) > (room.duration+5)*1000) {
                await run("UPDATE rooms SET state='finished' WHERE id=?", room.id);
                room.state = 'finished';
            }
            return Response.json({ room, players, passage: await passageDetails(room.passage_id), serverNow: Date.now() });
        }
    }
    return fail('This resource could not be found.', 404);
}
function secured(response:Response){const r=secureResponse(response);r.headers.set('Cache-Control','no-store');return r}
async function respond(req:Request){try{return secured(await handler(req))}catch(e:any){return secured(fail(e instanceof HttpFailure?e.message:e.message?.includes('Too many')?e.message:'We could not complete that request. Please try again.',e instanceof HttpFailure?e.status:e.message?.includes('Too many')?429:500))}}
export const GET=respond;export const POST=respond;export const DELETE=respond;
