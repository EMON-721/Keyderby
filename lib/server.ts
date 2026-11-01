import { env } from 'cloudflare:workers';
export const db = () => {
    if (!env.DB)
        throw new Error('Database unavailable');
    return env.DB;
};
export const uid = () => crypto.randomUUID();
export async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), x => x.toString(16).padStart(2, '0')).join(''); }
export const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2, '0')).join('');
export async function query(sql: string, ...args: any[]) { return (await db().prepare(sql).bind(...args).all()).results as any[]; }
export async function one(sql: string, ...args: any[]) { return (await query(sql, ...args))[0]; }
export async function run(sql: string, ...args: any[]) { return db().prepare(sql).bind(...args).run(); }
export async function auth(req: Request) {
    const t = (req.headers.get('cookie') || '').match(/(?:^|;\s*)kd_session=([^;]+)/)?.[1];
    if (!t)
        return null;
    return one('SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>? AND users.status=?', await hash(t), Date.now(), 'active');
}
export async function newSession(userId: string) { const t = token(); await run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)', await hash(t), userId, Date.now() + 30 * 86400000); return t; }
export async function limited(key: string, max = 60) {
    const t = Math.floor(Date.now() / 60000);
    const r = await one('INSERT INTO limits(id,count,reset) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count', key + ':' + t, Date.now() + 120000);
    if (r.count > max)
        throw new Error('Too many requests. Try again in a minute.');
    if (Math.random() < .01)
        await run('DELETE FROM limits WHERE reset<?', Date.now());
}
export function publicUser(u: any) { return { id: u.id, publicId: u.public_id, name: u.name, username: u.username, created: u.created, guest: !!u.guest, settings: JSON.parse(u.settings || '{}') }; }
