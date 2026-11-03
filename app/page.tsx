'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowRight, ArrowUpRight, Keyboard, Flag, Users, BookOpen, Target, BarChart3, Zap, Trophy, Timer, Sun, Moon, ChevronDown, ChevronRight, Check, CheckCircle2, RotateCcw, Settings, Volume2, VolumeX, X, Copy, Download, Shield, Lock, Search, Plus, Play, Home, TrendingUp, Flame, Car as CarIcon, LogOut, ExternalLink, HelpCircle, Info, Trash2, Pause, Maximize2, Bell, Award, Menu, Loader2, CheckCheck, Eye, RefreshCw } from 'lucide-react';
import { chars, score, badges } from '../lib/scoring';
import { countries, countryFlag, countryName } from '../lib/countries';
type Any = any;
const difficultyName=(d:string)=>d==='hard'?'Difficult':d==='medium'?'Medium':d==='easy'?'Easy':d;
const fmt = (n: number) => Math.round(n || 0).toLocaleString();
async function api(path: string, body?: Any, method?: string) {
    const r = await fetch('/api/' + path, { method: method || (body ? 'POST' : 'GET'), headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const data: any = await r.json();
    if (!r.ok)
        throw Object.assign(new Error(data.error || 'Something went wrong. Please try again.'), { details: data, status: r.status });
    return data;
}
function Car({ color = '#e94c45', className = '', style = {} }: {
    color?: string;
    className?: string;
    style?: Any;
}) { return <svg className={className} style={style} width="94" height="48" viewBox="0 0 125 60" fill="none" aria-hidden="true"><ellipse cx="62" cy="53" rx="53" ry="5" fill="#14284b" opacity=".13"/><path d="M14 29 32 11c3-3 7-4 12-4h28c8 0 12 4 18 18l20 7c5 2 7 6 7 13v3H8V37c0-4 2-7 6-8Z" fill={color}/><path d="m36 13-13 15h30V13H36Zm24 0v15h25l-9-15H60Z" fill="#c8ecfc"/><path d="M23 28h62" stroke="#15365e" strokeWidth="2"/><rect x="10" y="36" width="13" height="5" rx="2" fill="#ffdf82"/><rect x="106" y="35" width="10" height="5" rx="2" fill="#fff4c7"/><path d="M47 36h8M65 36h8" stroke="white" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round"/>{[31, 94].map(x => <g key={x}><circle cx={x} cy="46" r="12" fill="#173052"/><circle cx={x} cy="46" r="6" fill="#dfe7ee"/><circle cx={x} cy="46" r="2.5" fill="#7691ab"/></g>)}<path d="M18 32h84" stroke="white" strokeOpacity=".2" strokeWidth="3"/></svg>; }
function Empty({ icon: Icon = Flag, title, desc, action }: {
    icon?: Any;
    title: string;
    desc: string;
    action?: Any;
}) { return <div className="empty"><span className="empty-icon"><Icon size={28}/></span><h3>{title}</h3><p>{desc}</p>{action}</div>; }
export default function App() {
    const [page, setPage] = useState('home'), [user, setUser] = useState<Any>(null), [boot, setBoot] = useState<Any>(null), [data, setData] = useState<Any>({ results: [], goals: [], badges: [] }), [modal, setModal] = useState(''), [toast, setToast] = useState(''), [loadError, setLoadError] = useState(''), [theme, setTheme] = useState('light'), [roomId, setRoomId] = useState(''), [practiceOptions, setPracticeOptions] = useState<Any>({}), [info, setInfo] = useState('Typing guide'), [recoveryKey, setRecoveryKey] = useState(''), [profileOpen, setProfileOpen] = useState(false);
    const sessionActive = useRef(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const notify = useCallback((s: string) => { setToast(s); setTimeout(() => setToast(''), 4500); }, []);
    const refresh = useCallback(async () => { try {
        const b = await api('bootstrap');
        setUser(b.user);
        setBoot(b);
        setTheme(b.user.settings.theme || 'light');
        setData(await api('dashboard'));
        setLoadError('');
    }
    catch (e: Any) {
        setLoadError(e.message);
    } }, []);
    useEffect(() => { refresh(); const read = () => { const [p, id] = (location.hash.slice(1) || 'home').split('/'); if (p === 'room' && id) {
        setRoomId(id);
        setPage('room');
    }
    else
        setPage(['home', 'practice', 'test', 'race', 'friends', 'punctuation', 'numbers', 'custom', 'mistakes', 'leaderboard', 'dashboard', 'profile', 'settings', 'library', 'info', 'sources'].includes(p) ? p : 'home'); }; read(); const listener = (e: Event) => { sessionActive.current = !!(e as CustomEvent).detail; }; window.addEventListener('hashchange', read); window.addEventListener('kd:typing', listener); return () => { window.removeEventListener('hashchange', read); window.removeEventListener('kd:typing', listener); }; }, [refresh]);
    useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
    useEffect(() => {
        if (!user) return;
        const heartbeat = () => { if (document.visibilityState === 'visible') api('presence').catch(() => {}); };
        heartbeat();
        const timer = window.setInterval(heartbeat, 45000);
        document.addEventListener('visibilitychange', heartbeat);
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', heartbeat); };
    }, [user?.id]);
    useEffect(() => {
        if (!profileOpen) return;
        const outside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setProfileOpen(false);
        };
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setProfileOpen(false); };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', escape);
        return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
    }, [profileOpen]);
    const go = (p: string, options: Any = {}) => { if (sessionActive.current && !confirm('Leave this session? The unfinished result will not be saved.'))
        return; sessionActive.current = false; setPracticeOptions(options); setPage(p); location.hash = p; window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); };
    const toggleTheme = () => { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); if (user)
        api('settings', { ...user.settings, theme: next }).then(s => setUser({ ...user, settings: s })).catch((e: Any) => notify(e.message)); };
    const createRoom = async (options: Any) => { try {
        const r = await api('rooms', options);
        setRoomId(r.id);
        setPage('room');
        location.hash = 'room/' + r.id;
    }
    catch (e: Any) {
        notify(e.message);
    } };
    const enterRace=async()=>{try{const r=await api('matchmaking',{});setRoomId(r.id);setPage('room');location.hash='room/'+r.id}catch(e:Any){notify(e.message)}};
    const joinRoom = async (id: string) => { try {
        const code = id.trim().replace(/^.*#room\//, '').toUpperCase();
        await api('rooms/' + code + '/join', {});
        setRoomId(code);
        setPage('room');
        location.hash = 'room/' + code;
    }
    catch (e: Any) {
        notify(e.message);
    } };
    const isTyping = ['home', 'practice', 'test', 'punctuation', 'numbers', 'custom', 'mistakes'].includes(page);
    return <div className="app simple-app"><header className="header"><div className="header-inner"><a className="brand" href="#home" onClick={e => { e.preventDefault(); go('home'); }} aria-label="Keyderby home"><span className="brand-mark"><Keyboard size={22}/></span>keyderby</a><nav className="desktop-nav" aria-label="Main navigation">{[['home', 'Practice'], ['race', 'Race'], ['leaderboard', 'Rankings']].map(([p, label]) => <a href={'#' + p} className={(page === p || (p === 'home' && ['practice', 'test'].includes(page))) ? 'active' : ''} onClick={e => { e.preventDefault(); go(p); }} key={p}>{label}</a>)}</nav><div className="header-actions"><div className="profile-menu" ref={profileMenuRef}>
  <button className="profile-button" type="button" aria-haspopup="true" aria-expanded={profileOpen} aria-label="Open profile menu" disabled={!user} onClick={() => setProfileOpen(open => !open)}>
    {user && !user.guest ? <><span className="mini-avatar">{user.name[0]}</span><span className="profile-menu-name">{user.name}</span>{user.settings.countryCode && <span className="profile-country-flag" title={countryName(user.settings.countryCode)}>{countryFlag(user.settings.countryCode)}</span>}</> : <>Add your name<Plus size={14}/></>}<ChevronDown size={15}/>
  </button>
  {profileOpen && <div className="profile-menu-panel" role="group" aria-label="Profile options">
    <div className="profile-menu-identity"><strong>{user?.guest ? 'Guest driver' : user?.name}</strong><small>{user?.publicId || 'ID generated automatically'}</small></div>
    <button type="button" onClick={() => { setProfileOpen(false); go('profile'); }}><Users size={16}/>My profile</button>
    <button type="button" onClick={() => { setProfileOpen(false); go('dashboard'); }}><BarChart3 size={16}/>My progress</button>
    {user?.guest && <button type="button" onClick={() => { setProfileOpen(false); setModal('profile'); }}><Plus size={16}/>Set my name</button>}
    <button type="button" onClick={() => { setProfileOpen(false); go('settings'); }}><Settings size={16}/>Settings & ranking privacy</button>
    <button type="button" onClick={() => { toggleTheme(); setProfileOpen(false); }}>{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}{theme === 'light' ? 'Enable dark mode' : 'Enable light mode'}</button>
  </div>}
</div></div></div></header>
 <nav className="mobile-core-nav" aria-label="Mobile navigation">{[['home', 'Practice'], ['race', 'Race'], ['leaderboard', 'Rankings']].map(([p, l]) => <a className={page === p ? 'active' : ''} href={'#' + p} onClick={e => { e.preventDefault(); go(p); }} key={p}>{l}</a>)}</nav>
 <main className="main" id="main-content">{loadError && <div className="alert">{loadError}<button onClick={refresh}>Try again</button></div>}
 {!user && !loadError && <Empty icon={Keyboard} title="Preparing your typing session…" desc="Your passage will appear in a moment."/>}{user && <>
 {isTyping && <><div className="quiet-intro"><h1>{page === 'mistakes' ? 'Give tricky words another try.' : page === 'custom' ? 'Practice your own words.' : 'Find your typing rhythm.'}</h1><p>{'Choose a passage. Start typing. Your progress saves automatically.'}</p></div>{['home', 'practice', 'test'].includes(page) && <div className="simple-mode-bar"><div className="segmented"><button className={page !== 'test' ? 'active' : ''} onClick={() => go('home')}>Practice</button><button className={page === 'test' ? 'active' : ''} onClick={() => go('test', { duration: 60 })}>Timed test</button></div></div>}<Typing compact key={page + JSON.stringify(practiceOptions)} mode={page === 'home' ? 'practice' : page} options={practiceOptions} user={user} notify={notify} go={go} onSaved={refresh}/></>}
 {(page === 'race' || page === 'friends') && <RaceLobby friends={page === 'friends'} createRoom={createRoom} joinRoom={joinRoom} enterRace={enterRace} notify={notify} go={go}/>}
 {page === 'room' && roomId && <Room id={roomId} user={user} notify={notify} go={go} onSaved={refresh}/>}
 {page === 'dashboard' && <Dashboard data={data} user={user} go={go} refresh={refresh} notify={notify}/>}
 {page === 'leaderboard' && <Leaderboard notify={notify} go={go}/>}
 {page === 'profile' && <Profile user={user} data={data} refresh={refresh} notify={notify} setModal={setModal} go={go} recoveryKey={recoveryKey}/>}
 {page === 'settings' && <SettingsPage user={user} refresh={refresh} notify={notify} setTheme={setTheme}/>}
 {page === 'library' && <Library go={go} notify={notify}/>}
 {page === 'sources' && <Sources />}
 {page === 'info' && <InfoPage topic={info} go={go} notify={notify}/>}
 </>}
 </main><footer className="quiet-footer"><span>© {new Date().getFullYear()} Keyderby · Created by Md. Emon Hossain</span></footer>
 {modal && <ProfileModal mode={modal} close={() => setModal('')} user={user} refresh={refresh} notify={notify} onCreated={(code: string) => setRecoveryKey(code)}/>}
 {toast && <div className="toast" role="status"><Info size={17}/>{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={14}/></button></div>}
 </div>;
}
function PageTitle({ eyebrow, title, description, action }: {
    eyebrow: string;
    title: string;
    description: string;
    action?: Any;
}) { return <div className="page-title"><div><span className="eyebrow muted">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
function Typing({ mode, options = {}, user, notify, go, onSaved, disabled = false, roomId, roomStart, roomPassage, onRaceDone, compact = false }: {
    mode: string;
    options?: Any;
    user: Any;
    notify: Any;
    go: Any;
    onSaved: Any;
    disabled?: boolean;
    roomId?: string;
    roomStart?: number;
    roomPassage?: Any;
    onRaceDone?: Any;
    compact?: boolean;
}) {
    const [difficulty, setDifficulty] = useState(options.difficulty || 'easy'), [duration, setDuration] = useState([15,30,60,120,300].includes(options.duration)?options.duration:60), [list, setList] = useState<Any[]>([]), [selected, setSelected] = useState(''), [passageSearch, setPassageSearch] = useState(''), [catalogLoading, setCatalogLoading] = useState(false), [catalogTotal, setCatalogTotal] = useState(0), [selectedDetail, setSelectedDetail] = useState<Any>(null), [attempt, setAttempt] = useState<Any>(null), [typed, setTyped] = useState(''), [elapsed, setElapsed] = useState(0), [status, setStatus] = useState('setup'), [result, setResult] = useState<Any>(null), [busy, setBusy] = useState(false), [custom, setCustom] = useState(''), [review, setReview] = useState(false), [pause, setPause] = useState(false);
    const input = useRef<HTMLTextAreaElement>(null), started = useRef(0), typedRef = useRef(''), strokes = useRef(0), wrong = useRef(0), finishing = useRef(false), attemptRef = useRef<Any>(null), clock = useRef(0), pauseAt = useRef(0), pausedTime = useRef(0), tickRef = useRef<Any>(null), lastProgress = useRef(0), inputChain = useRef<Promise<Any>>(Promise.resolve());
    const target = attempt?.snapshot || roomPassage?.text || (selectedDetail?.id === selected ? selectedDetail.text : '') || '', targetChars = useMemo(() => chars(target), [target]), typedChars = useMemo(() => chars(typed), [typed]), metrics = score(target, typed, Math.max(.01, elapsed), strokes.current, wrong.current), remaining = Math.max(0, duration - elapsed), font = user?.settings?.font || 'mono';
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('kd:typing', { detail: status === 'running' }));
        const unload = (e: BeforeUnloadEvent) => {
            if (status === 'running') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', unload);
        return () => { window.dispatchEvent(new CustomEvent('kd:typing', { detail: false })); window.removeEventListener('beforeunload', unload); };
    }, [status]);
    const windowStart = Math.max(0, Math.floor((typedChars.length - 80) / 200) * 200);
    const selectedPassage=roomPassage||(selectedDetail?.id===selected?selectedDetail:null)||list.find((p:Any)=>p.id===selected);
    const visiblePassages = useMemo(() => {
        const term = passageSearch.trim().toLowerCase();
        if (!term) return list;
        const matches = list.filter((p:Any) => (p.displayId + ' ' + p.title + ' ' + p.category).toLowerCase().includes(term));
        const chosen = list.find((p:Any) => p.id === selected);
        return chosen && !matches.some((p:Any) => p.id === selected) ? [chosen, ...matches] : matches;
    }, [list, passageSearch, selected]);
    const actualMode = options.challenge ? 'challenge' : mode === 'test' ? 'test' : mode;
    useEffect(() => {
        if (!['practice','test'].includes(mode) || roomId) return;
        let current = true;
        setCatalogLoading(true);
        setCatalogTotal(0);
        setList([]);
        setSelected('');
        setSelectedDetail(null);
        setPassageSearch('');
        (async () => {
            const base = 'passages/options?difficulty=' + encodeURIComponent(difficulty) + '&limit=500';
            const first = await api(base + '&offset=0');
            const count = Number(first.total) || 0;
            const pages = Array.from({ length: Math.max(0, Math.ceil(count / 500) - 1) }, (_,i) => i + 1);
            const rest = await Promise.all(pages.map(i => api(base + '&offset=' + (i * 500))));
            const passages = [...first.passages, ...rest.flatMap((page:Any) => page.passages)];
            if (passages.length !== count || new Set(passages.map((p:Any) => p.id)).size !== count)
                throw new Error('The full passage catalog could not be loaded. Please retry.');
            passages.sort((a:Any,b:Any) => (['easy','medium','hard'].indexOf(a.difficulty) - ['easy','medium','hard'].indexOf(b.difficulty)) || (Number(a.number)-Number(b.number)));
            const specific = options.passageId ? await api('passages/' + encodeURIComponent(options.passageId)) : null;
            if (specific && !passages.some((p:Any) => p.id === specific.id)) passages.unshift(specific);
            if (current) {
                setList(passages);
                setCatalogTotal(count);
                setSelected(specific?.id || passages[0]?.id || '');
            }
        })().catch((error:Any) => { if (current) notify(error.message); })
            .finally(() => { if (current) setCatalogLoading(false); });
        return () => { current = false; };
    }, [difficulty, mode, notify, options.passageId, roomId]);
    useEffect(() => {
        if (!['practice','test'].includes(mode) || !selected) return;
        let current = true;
        setSelectedDetail(null);
        api('passages/' + encodeURIComponent(selected))
            .then((passage:Any) => { if (current) setSelectedDetail(passage); })
            .catch((error:Any) => { if (current) notify(error.message); });
        return () => { current = false; };
    }, [selected, mode, notify]);
    const reset = async () => {
        const a = attemptRef.current;
        if (a && !result) {
            try {
                await api('attempts/' + a.id + '/cancel', {});
            }
            catch { }
        }
        clearInterval(tickRef.current);
        setAttempt(null);
        attemptRef.current = null;
        setTyped('');
        typedRef.current = '';
        setResult(null);
        setElapsed(0);
        setStatus('setup');
        setReview(false);
        setPause(false);
        started.current = 0;
        finishing.current = false;
        strokes.current = 0;
        wrong.current = 0;
        pausedTime.current = 0;
    };
    const prepare = async () => {
        if (disabled) {
            notify('This feature is temporarily disabled.');
            return;
        }
        if (['practice','test'].includes(mode) && (!selected || catalogLoading)) {
            notify('Choose a passage after the full list finishes loading.');
            return;
        }
        setBusy(true);
        try {
            if (attemptRef.current)
                await api('attempts/' + attemptRef.current.id + '/cancel', {});
            const r = await api('attempts', { mode: actualMode, passageId: selected, difficulty, duration, text: custom, roomId });
            setDuration(r.attempt.duration);
            setAttempt(r.attempt);
            attemptRef.current = r.attempt;
            setTyped('');
            typedRef.current = '';
            setElapsed(0);
            started.current = 0;
            strokes.current = 0;
            wrong.current = 0;
            finishing.current = false;
            setResult(null);
            setReview(false);
            if(roomId){const start=await api('attempts/'+r.attempt.id+'/start',{});started.current=start.started;clock.current=performance.now()-Math.max(0,Date.now()-start.started);setStatus('running')}else setStatus('ready');
            setTimeout(() => input.current?.focus(), 100);
        }
        catch (e: Any) {
            if (e.details?.activeAttemptId && confirm('Your profile has an unfinished session. Discard it and start this session?')) {
                await api('attempts/' + e.details.activeAttemptId + '/cancel', {});
                await prepare();
            }
            else
                notify(e.message);
        }
        finally {
            setBusy(false);
        }
    };
    useEffect(() => {
        if (roomId && roomStart && Date.now() >= roomStart && !attemptRef.current)
            prepare();
    }, [roomId, roomStart]);
    const finish = useCallback(async () => {
        if (finishing.current || !attemptRef.current || !started.current)
            return;
        finishing.current = true;
        clearInterval(tickRef.current);
        setStatus('saving');
        try {
            await inputChain.current;
            const r = await api('attempts/' + attemptRef.current.id + '/finish', { typed: typedRef.current, strokes: strokes.current, wrong: wrong.current });
            setResult(r.result);
            setStatus('finished');
            onSaved();
            onRaceDone?.(r.result);
        }
        catch (e: Any) {
            notify(e.message);
            setStatus('saveError');
            finishing.current = false;
        }
    }, [notify, onSaved, onRaceDone]);
    useEffect(() => {
        if (status !== 'running' || pause)
            return;
        tickRef.current = setInterval(() => {
            const seconds = (performance.now() - clock.current - pausedTime.current) / 1000;
            setElapsed(seconds);
            if (seconds >= duration)
                finish();
            if (performance.now() - lastProgress.current > 800 && seconds < duration) {
                lastProgress.current = performance.now();
                api(roomId?'rooms/'+roomId+'/progress':'attempts/'+attemptRef.current.id+'/progress',{typed:typedRef.current}).catch(()=>{});
            }
        }, 100);
        return () => clearInterval(tickRef.current);
    }, [status, pause, duration, roomId, finish]);
    useEffect(() => () => {
        clearInterval(tickRef.current);
        const a = attemptRef.current;
        if (a && !finishing.current)
            fetch('/api/attempts/' + a.id + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', keepalive: true }).catch(() => { });
    }, []);
    useEffect(() => {
        if (status === 'running')
            document.querySelector('.char.current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }, [typed, status]);
    const change = (value: string) => {
        if (!attempt || !['ready', 'running'].includes(status) || pause)
            return;
        if (!started.current) {
            started.current = Date.now();
            clock.current = performance.now() - (roomId && roomStart ? Math.max(0, Date.now() - roomStart) : 0);
            setStatus('running');
            inputChain.current = api('attempts/' + attempt.id + '/start', {}).then(r => { clock.current = performance.now() - Math.max(0, Date.now() - r.started); return r; }).catch((e: Any) => { notify(e.message); setStatus('setup'); started.current = 0; throw e; });
        }
        const previous = chars(typedRef.current), next = chars(value);
        if (user?.settings.noBackspace && next.length < previous.length)
            return;
        let v = value;
        if (next.length > previous.length) {
            const added = next.slice(previous.length);
            strokes.current += added.length;
            added.forEach((c, i) => {
                if (c !== targetChars[previous.length + i])
                    wrong.current++;
            });
            if (user?.settings.strict && added.some((c, i) => c !== targetChars[previous.length + i]))
                v = typedRef.current;
        }
        if (chars(v).length > targetChars.length)
            v = chars(v).slice(0, targetChars.length).join('');
        typedRef.current = v;
        setTyped(v);
        if (chars(v).length >= targetChars.length && (!roomId || v === target))
            setTimeout(finish, 0);
    };
    const next = async () => {
        await reset();
        if (list.length)
            setSelected(list[(list.findIndex(x => x.id === selected) + 1) % list.length].id);
    };
    const onPause = async () => {
        if (roomId || duration || !attemptRef.current)
            return;
        try {
            await api('attempts/' + attemptRef.current.id + '/pause', { pause: !pause });
            setPause(!pause);
            if (!pause)
                pauseAt.current = performance.now();
            else {
                pausedTime.current += performance.now() - pauseAt.current;
                input.current?.focus();
            }
        }
        catch (e: Any) {
            notify(e.message);
        }
    };
    const names: Any = { practice: 'Find your typing rhythm.', test: 'Ready. Set. Type.', punctuation: 'Every little mark matters.', numbers: 'Get your numbers up to speed.', custom: 'Your words. Your practice.', mistakes: 'Turn mistakes into muscle memory.', race: 'Keep your eyes on the finish.' };
    const active = ['ready', 'running', 'saving', 'saveError'].includes(status);
    if (result) {
        let mistakes: Any[] = [];
        try {
            mistakes = JSON.parse(result.mistakes || '[]');
        }
        catch { }
        return <div className="results-page"><PageTitle eyebrow="ONE LAP BETTER" title="Look at you go." description={(result.displayId?result.displayId+' · ':'')+result.title + ' · ' + result.difficulty + ' · ' + Math.round(result.elapsed) + ' seconds'} action={<span className="pill green"><CheckCircle2 size={14}/>Saved to your progress</span>}/><section className="result-hero panel"><span className="result-trophy"><Trophy size={52}/></span><div><span className="eyebrow muted">YOUR CORRECTED SPEED</span><div className="result-speed">{Math.round(result.wpm)}<small>WPM</small></div><p>{result.wpm >= 60 ? 'That was a great lap. Keep that rhythm going.' : result.accuracy >= 95 ? 'Careful keystrokes. A strong foundation to build on.' : 'Every session is a step forward. Accuracy comes before speed.'}</p></div><div className="result-side"><div><Target size={21}/><span>Final accuracy<strong>{result.accuracy.toFixed(1)}%</strong></span></div><div><Zap size={21}/><span>Raw speed<strong>{Math.round(result.raw)} WPM</strong></span></div><div><Timer size={21}/><span>Time on track<strong>{result.elapsed.toFixed(1)} s</strong></span></div></div></section><div className="stats-grid result-stats">{[['FIRST-ATTEMPT ACCURACY', result.first_accuracy?.toFixed(1) + '%'], ['UNCORRECTED ERRORS', result.errors], ['CORRECTED MISTAKES', result.corrected], ['CHARACTERS TYPED', result.typed?.length || 0]].map(([k, v]) => <div className="stat-card panel" key={k}><span>{k}</span><strong>{v}</strong></div>)}</div><div className="result-buttons"><button className="btn primary" onClick={async () => { await reset(); setTimeout(prepare, 30); }}><RotateCcw size={17}/>Try again</button><button className="btn white" onClick={next}>Next passage<ArrowRight size={17}/></button><button className="btn white" onClick={() => setReview(!review)}><Search size={17}/>{review ? 'Hide' : 'Review'} mistakes</button><button className="btn white" onClick={() => go('dashboard')}><BarChart3 size={17}/>My dashboard</button><button className="icon-button" aria-label="Copy result" onClick={() => { navigator.clipboard.writeText(`My Keyderby lap: ${Math.round(result.wpm)} WPM · ${result.accuracy.toFixed(1)}% accuracy · ${Math.round(result.elapsed)}s`).then(() => notify('Result copied.')).catch(() => notify('Clipboard unavailable.')); }}><Copy size={18}/></button></div>{review && <section className="panel mistake-panel"><h3>A closer look at your keystrokes</h3>{!mistakes.length ? <p className="success-text">No uncorrected character errors. Nicely done.</p> : <><p>Character positions use a direct comparison. Insertions may shift later positions; this is not a word-alignment diagnosis.</p><div className="table-scroll"><table><thead><tr><th>Position</th><th>Expected</th><th>Typed</th><th>Category</th></tr></thead><tbody>{mistakes.slice(0, 100).map((m: Any) => <tr key={m.position}><td>{m.position + 1}</td><td><kbd>{m.expected === ' ' ? 'space' : m.expected}</kbd></td><td><kbd>{m.typed === ' ' ? 'space' : m.typed}</kbd></td><td>{m.kind}</td></tr>)}</tbody></table></div><button className="btn primary" onClick={() => go('mistakes')}>Practice my mistakes<ArrowRight size={16}/></button></>}</section>}<p className="fine-print">Corrected WPM = correctly matched character positions ÷ 5 ÷ elapsed minutes. Raw WPM counts all current characters. First-attempt accuracy includes corrected mistakes. {result.eligible ? 'This score meets the current leaderboard eligibility checks.' : 'Saved as a personal practice result.'}</p></div>;
    }
    return <>{!compact && <PageTitle eyebrow={roomId ? 'LIVE DERBY' : options.challenge ? 'THE DAILY CHALLENGE' : 'YOUR KEYBOARD. YOUR STARTING LINE.'} title={options.challenge ? 'A little better today.' : names[mode] || names.practice} description={mode === 'custom' ? 'Your custom text stays private and is removed from stored results.' : 'Focus on accuracy first. Speed will find its way.'} action={!roomId && <button className="text-button" onClick={() => go('settings')}><Settings size={17}/>Typing preferences</button>}/>}
 
 {!roomId && !compact && <div className="practice-tabs">{[['practice', 'Passages', BookOpen], ['test', 'Timed test', Timer], ['punctuation', 'Punctuation', Target], ['numbers', 'Numbers', Zap], ['custom', 'Custom text', Plus]].map(([id, label, Icon]: Any) => <button className={mode === id ? 'active' : ''} disabled={active} onClick={() => go(id)} key={id}><Icon size={16}/>{label}</button>)}</div>}
 <section className="typing-panel panel">
 {!roomId && <div className="typing-config"><label>Difficulty<select value={difficulty} disabled={active} onChange={e => setDifficulty(e.target.value)}>{['easy', 'medium', 'hard', 'mixed'].map(d => <option value={d} key={d}>{difficultyName(d)}</option>)}</select></label><label>Duration<select value={duration} disabled={active} onChange={e => setDuration(Number(e.target.value))}>{[[15, '15 seconds'], [30, '30 seconds'], [60, '60 seconds'], [120, '2 minutes'], [300, '5 minutes']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>{!['custom', 'mistakes', 'numbers', 'punctuation'].includes(mode) && <div className="passage-picker">
    <label className="passage-search">Search all passages<input type="search" aria-label="Search all passages by ID, title or category" placeholder="Search ID, title or category…" value={passageSearch} disabled={active || catalogLoading} onChange={e => setPassageSearch(e.target.value)}/></label>
    <label className="passage-select">Passage<select value={selected} disabled={active || catalogLoading} onChange={e => setSelected(e.target.value)}>{visiblePassages.map((p:Any) => <option key={p.id} value={p.id}>{p.displayId ? `${p.displayId} · ${p.title}` : p.title}</option>)}</select><small className="passage-count" role="status">{catalogLoading ? 'Loading complete catalog…' : `${visiblePassages.length.toLocaleString()} shown · ${catalogTotal.toLocaleString()} available in ${difficultyName(difficulty)}`}</small></label>
</div>}<button className="icon-button" aria-label="New passage" disabled={active || catalogLoading} onClick={next}><RefreshCw size={18}/></button></div>}
 {mode === 'custom' && status === 'setup' && <div className="custom-input"><label>Paste your practice text<textarea maxLength={10000} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Paste a paragraph, a story, or something you are learning…"/></label><span>{custom.length.toLocaleString()} / 10,000 characters · Private practice only</span></div>}

 <div className="passage-identity"><span className="passage-number">{attempt?.displayId||selectedPassage?.displayId||'WORD PRACTICE'}</span><strong>{attempt?.title||selectedPassage?.title||names[mode]||'Typing practice'}</strong><span className={'difficulty '+(attempt?.difficulty||selectedPassage?.difficulty||difficulty)}>{difficultyName(attempt?.difficulty||selectedPassage?.difficulty||difficulty)}</span></div> <div className="typing-metrics"><div><strong>{status === 'setup' ? '—' : Math.round(metrics.wpm)}</strong><span>WPM</span></div><div><strong>{status === 'setup' ? '—' : metrics.accuracy.toFixed(0) + '%'}</strong><span>ACCURACY</span></div><div className="metric-time"><Timer size={22}/><strong>{Math.ceil(remaining)}<small>s</small></strong><span>{'REMAINING'}</span></div><div><strong>{Math.round(metrics.completion)}<small>%</small></strong><span>PROGRESS</span></div></div>
 <div className="practice-track"><div className="lane-line"/><Car color="#248d85" style={{ left: `calc(${Math.min(100, metrics.completion)}% - ${metrics.completion * .85}px)` }}/><span className="track-finish">▧</span><span className="you-label">YOU</span></div>
 {(user?.settings?.noBackspace || user?.settings?.strict) && <p className="mode-warning">{user.settings.strict ? 'Strict mode: incorrect keystrokes are blocked and counted as errors. ' : ''}{user.settings.noBackspace ? 'No-backspace mode is enabled.' : ''} These settings are excluded from standard leaderboards.</p>}
 <div className={'typing-workspace ' + (status === 'setup' ? 'preview-text' : '') + (pause ? ' paused' : '')} style={{ fontFamily: font === 'mono' ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : font === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif', fontSize: user?.settings?.fontSize || 23, lineHeight: user?.settings?.lineHeight || 1.9 }} onClick={() => input.current?.focus()}>
 <p id="typing-target" className="sr-only">Type this passage: {target}</p><div className="target-text" aria-hidden="true">{target ? targetChars.slice(windowStart, windowStart + 700).map((c, j) => { const i = j + windowStart; return <span className={'char ' + (i < typedChars.length ? (typedChars[i] === c ? 'correct' : 'incorrect') : i === typedChars.length ? 'current' : '')} key={i}>{c}</span>; }) : <span>{mode === 'numbers' ? '42 17.5 100% $24.99 2026 3+7=10' : mode === 'punctuation' ? 'Wait, listen. "Is it ready?" Yes! (Check twice); then: start.' : mode === 'custom' ? 'Your private practice text will appear here.' : mode === 'mistakes' ? 'Your saved word mistakes will become your next practice session.' : 'Loading your next passage…'}</span>}</div>
 {['ready', 'running'].includes(status) && <textarea ref={input} className="typing-capture" value={typed} disabled={pause} aria-label="Type the displayed passage here" aria-describedby="typing-instructions typing-target" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} onChange={e => change(e.target.value)} onPaste={e => { e.preventDefault(); notify('Type each character to keep the result meaningful.'); }} onDrop={e => e.preventDefault()} onKeyDown={e => {
                if (e.key === 'Escape' && !roomId)
                    onPause();
                if (e.key === 'Backspace' && user?.settings?.noBackspace)
                    e.preventDefault();
            }}/>}
 {status === 'setup' && <div className="start-overlay"><button className="btn primary" disabled={busy || disabled || (!selected && !['punctuation', 'numbers', 'custom', 'mistakes'].includes(mode))} onClick={prepare}>{busy ? <Loader2 className="spin" size={18}/> : <Play size={17}/>}Start {mode === 'test' ? 'typing test' : 'practice'}</button><span>Timer starts with your first keystroke.</span></div>}
 {pause && <div className="start-overlay"><button className="btn primary" onClick={onPause}><Play size={17}/>Resume practice</button><span>Pause time is excluded from live metrics.</span></div>}
 {status === 'saving' && <div className="start-overlay"><Loader2 className="spin"/><strong>Saving your lap…</strong></div>}
 {status === 'saveError' && <div className="start-overlay"><button className="btn primary" onClick={finish}>Retry saving result</button></div>}
 </div>
 <div className="typing-bottom"><span id="typing-instructions">{status === 'ready' ? <><span className="live-dot"/>Ready when you are. Start typing to begin.</> : status === 'running' ? <><span className="live-dot"/>Find your flow. Keep going.</> : <><Keyboard size={15}/>Accuracy first. Speed follows.</>}</span><div>{status === 'running' && !duration && !roomId && <button className="icon-button" onClick={onPause} aria-label="Pause practice"><Pause size={17}/></button>}{active && <><button className="text-button" onClick={async () => {
                if (confirm('Restart this session? Your unfinished result will not be saved.'))
                    await reset();
            }}><RotateCcw size={15}/>Restart</button>{started.current > 0 && !roomId && <button className="btn small white" onClick={finish}>Finish session<Check size={15}/></button>}</>}</div></div>
 <div className="typing-progress"><div style={{ width: metrics.completion + '%' }}/></div>
 </section>

 {!roomId && !compact && <div className="practice-below"><div className="tip-card"><span className="tip-icon"><Info size={20}/></span><div><strong>A tip for the road</strong><p>Relax your shoulders. Keep your eyes on the text. A steady rhythm is more useful than a rushed start.</p></div></div><button className="text-button" onClick={() => go('library')}>Browse the passage library<ArrowRight size={16}/></button></div>}
 </>;
}
function Dashboard({ data, user, go, notify }: Any) { const rs = data.results || [], avg = rs.length ? rs.reduce((n: number, r: Any) => n + r.wpm, 0) / rs.length : 0, best = Math.max(0, ...rs.map((r: Any) => r.wpm)), acc = rs.length ? rs.reduce((n: number, r: Any) => n + r.accuracy, 0) / rs.length : 0; return <><PageTitle eyebrow="YOUR PROGRESS" title={user && !user.guest ? `${user.name}’s practice` : 'Your practice, so far.'} description="Every saved session, in one place." action={<button className="btn primary" onClick={() => go('home')}>Keep typing<ArrowRight size={16}/></button>}/><div className="stats-grid">{[['AVERAGE', rs.length ? fmt(avg) : '—', 'WPM'], ['BEST', rs.length ? fmt(best) : '—', 'WPM'], ['ACCURACY', rs.length ? acc.toFixed(1) : '—', '%'], ['SESSIONS', rs.length, '']].map(([k, v, unit]) => <div className="stat-card panel" key={k}><span>{k}</span><strong>{v}<small>{unit}</small></strong></div>)}</div><section className="panel history simple-history"><div className="panel-heading"><h3>Recent sessions</h3>{rs.length > 0 && <button className="text-button" onClick={() => go('mistakes')}>Practice mistakes<ArrowRight size={15}/></button>}</div>{!rs.length ? <Empty icon={Keyboard} title="Your first session starts here." desc="Type a passage and your result will be saved automatically." action={<button className="btn primary" onClick={() => go('home')}>Start typing<ArrowRight size={16}/></button>}/> : <div className="table-scroll"><table><thead><tr><th>Passage</th><th>Speed</th><th>Accuracy</th><th>Date</th><th /></tr></thead><tbody>{rs.slice(0, 30).map((r: Any) => <tr key={r.id}><td><strong>{r.title}</strong><small>{r.difficulty} · {Math.round(r.elapsed)} seconds</small></td><td><strong>{fmt(r.wpm)}</strong> WPM</td><td>{r.accuracy.toFixed(1)}%</td><td>{new Date(r.finished).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td><td>{r.passage_id && <button className="icon-button" aria-label={'Practice ' + r.title + ' again'} onClick={() => go('practice', { passageId: r.passage_id, difficulty: r.difficulty })}><RotateCcw size={15}/></button>}</td></tr>)}</tbody></table></div>}</section></>; }
function download(name: string, text: string, type: string) { const url = URL.createObjectURL(new Blob([text], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function ProfileModal({ mode, close, user, refresh, notify, onCreated }: Any) { const [name, setName] = useState(user?.guest ? '' : user?.name || ''), [recovery, setRecovery] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''); const recover = mode === 'recover'; return <div className="modal-scrim" onClick={close}><div role="dialog" aria-modal="true" aria-labelledby="profile-title" className="modal simple-profile-modal" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape')
    close(); if (e.key === 'Tab') {
    const fields = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled])'));
    const first = fields[0], last = fields[fields.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
    }
} }}><button className="modal-close icon-button" onClick={close} aria-label="Close profile dialog"><X size={20}/></button><h2 id="profile-title">{recover ? 'Restore your progress' : 'What should we call you?'}</h2><p>{recover ? 'Use a recovery code you saved earlier.' : 'Just your name. We’ll create your ID automatically.'}</p><form onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
    const r = await api(recover ? 'recover' : 'profile', recover ? { code: recovery } : { name });
    if (r.recoveryCode)
        onCreated(r.recoveryCode);
    await refresh();
    close();
    notify(recover ? 'Your progress is restored.' : 'Profile saved. You’re ready to type.');
}
catch (e: Any) {
    setError(e.message);
}
finally {
    setBusy(false);
} }}><label>{recover ? 'Saved recovery code' : 'Your name'}<input autoFocus value={recover ? recovery : name} onChange={e => recover ? setRecovery(e.target.value) : setName(e.target.value)} maxLength={recover ? 100 : 40} minLength={recover ? 10 : 2} required placeholder={recover ? 'KD-…' : 'Your display name'} autoComplete={recover ? 'off' : 'name'}/></label>{!recover && <div className="auto-id-preview"><span>Your ID</span><code>{user?.publicId || 'Created automatically'}</code><CheckCircle2 size={14}/></div>}{error && <div className="form-error" role="alert">{error}</div>}<button className="btn primary full" disabled={busy}>{busy ? <Loader2 className="spin" size={16}/> : null}{recover ? 'Restore progress' : 'Save and continue'}<ArrowRight size={16}/></button></form></div></div>; }
function Profile({ user, refresh, notify, setModal, go, recoveryKey }: Any) { if (!user)
    return <Empty title="Loading your profile…" desc="One moment."/>; return <><PageTitle eyebrow="YOUR PROFILE" title={user.guest ? 'Make your progress yours.' : user.name} description="No email or password needed."/><section className="panel simple-profile"><div className="profile-summary"><span className="profile-avatar">{user.guest ? <Keyboard size={32}/> : user.name[0]}</span><div><h2>{user.guest ? 'Guest typist' : user.name}</h2><p><span>Driver ID</span><code>{user.publicId || 'Being assigned'}</code></p><small>Joined {new Date(user.created).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div></div><button className="btn primary" onClick={() => setModal('profile')}>{user.guest ? 'Add your name' : 'Edit name'}<ArrowRight size={16}/></button><div className="profile-data-actions"><button className="text-button" onClick={() => go('dashboard')}>My progress<BarChart3 size={15}/></button><button className="text-button" onClick={async () => { const d = await api('export'); download('keyderby-my-data.json', JSON.stringify(d, null, 2), 'application/json'); }}>Export my data<Download size={15}/></button></div><details className="profile-recovery"><summary>Optional recovery & privacy</summary><p>Your progress stays connected to this browser. Save a recovery code if you want to restore it elsewhere.</p>{recoveryKey ? <button className="btn white small" onClick={() => download('keyderby-recovery.txt', `Keyderby: ${user.name}\nDriver ID: ${user.publicId || 'Not assigned'}\nPrivate recovery code: ${recoveryKey}\nKeep this code private.\n`, 'text/plain')}><Download size={15}/>Save recovery code</button> : !user.guest && <button className="btn white small" onClick={async () => { try {
    const r = await api('profile', { name: user.name, rotateRecovery: true });
    download('keyderby-recovery.txt', `Keyderby private recovery code: ${r.recoveryCode}\nKeep this code private.\n`, 'text/plain');
    await refresh();
}
catch (e: Any) {
    notify(e.message);
} }}>Create a recovery code</button>}<button className="text-button" onClick={() => setModal('recover')}>Restore saved progress<ArrowRight size={14}/></button>{!user.guest && <button className="text-button delete-profile" onClick={async () => { if (!confirm('Delete your profile and saved results? This cannot be undone.'))
    return; await api('profile', {}, 'DELETE'); await refresh(); go('home'); notify('Your profile has been deleted.'); }}>Delete my profile<Trash2 size={14}/></button>}</details></section></>; }
function SettingsPage({ user, refresh, notify, setTheme }: Any) { const [s, setS] = useState<Any>(user?.settings || {}), [busy, setBusy] = useState(false); useEffect(() => { if (user)
    setS(user.settings); }, [user]); return <><PageTitle eyebrow="YOUR COMFORT" title="Make typing feel right." description="A few simple preferences."/><form className="panel simple-settings" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try {
    await api('settings', s);
    setTheme(s.theme || 'light');
    await refresh();
    notify('Preferences saved.');
}
catch (e: Any) {
    notify(e.message);
}
finally {
    setBusy(false);
} }}><label>Appearance<select value={s.theme || 'light'} onChange={e => setS({ ...s, theme: e.target.value })}><option value="light">Light</option><option value="dark">Graphite</option></select></label><label>Typing font<select value={s.font || 'mono'} onChange={e => setS({ ...s, font: e.target.value })}><option value="mono">Monospace</option><option value="sans">Sans serif</option><option value="serif">Serif</option></select></label><label>Text size · {s.fontSize || 23}px<input type="range" min={16} max={36} value={s.fontSize || 23} onChange={e => setS({ ...s, fontSize: Number(e.target.value) })}/></label><div className="font-preview" style={{ fontFamily: s.font === 'serif' ? 'Georgia' : s.font === 'sans' ? 'Arial' : 'monospace', fontSize: s.fontSize || 23 }}>One keystroke at a time.</div><details className="profile-recovery"><summary>Global rankings & privacy</summary><Toggle label="Show my qualifying scores and recent online status" description="Opt in to public rankings for practice, timed tests and races. Your name, score, total session count/time, optional country and recent online activity may be displayed." checked={s.leaderboard && s.visibility === 'public'} onChange={(v: boolean) => setS({ ...s, leaderboard: v, visibility: v ? 'public' : 'private' })}/><label>Country or territory (optional)<select value={s.countryCode || ''} onChange={e => setS({ ...s, countryCode: e.target.value, country: '' })}><option value="">Not specified</option>{countries.map(c => <option value={c.code} key={c.code}>{countryFlag(c.code)} {c.name}</option>)}</select><small>Choose your flag. Shown only when you opt in to public rankings. Location is not inferred from your IP address.</small></label></details><button className="btn primary" disabled={busy}><Check size={16}/>Save preferences</button></form></>; }
function Toggle({ label, description, checked, onChange, disabled = false }: Any) { return <label className="toggle-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" role="switch" disabled={disabled} checked={!!checked} onChange={e => onChange(e.target.checked)}/></label>; }
function RaceLobby({friends,createRoom,joinRoom,enterRace,notify,go}:Any){
 const [code,setCode]=useState(''),[name,setName]=useState(''),[difficulty,setDifficulty]=useState('easy'),[capacity,setCapacity]=useState(4),[duration,setDuration]=useState(60),[loading,setLoading]=useState(false);
 return <><PageTitle eyebrow="RACE" title={friends?'Race with friends.':'Enter. Get matched. Race.'} description={friends?'Create a private room or join with your friend’s code.':'One click puts you in the next public race. No room setup or registration.'}/><div className="race-page-tools"><div className="segmented"><button className={!friends?'active':''} onClick={()=>go('race')}>Public race</button><button className={friends?'active':''} onClick={()=>go('friends')}>With friends</button></div><button className="text-button" onClick={()=>go('leaderboard')}>Leaderboard<ArrowRight size={14}/></button></div>{!friends?<section className="panel public-race-entry"><div className="race-entry-mark"><Flag size={33}/></div><h2>Your next race is one click away.</h2><p>Join up to four other typists. Everyone gets the same passage and a shared 60-second timer.</p><div className="race-entry-facts"><span><Users size={16}/>2–5 players</span><span><Timer size={16}/>60 seconds</span><span><CheckCircle2 size={16}/>Automatic start</span></div><button className="btn primary" disabled={loading} onClick={async()=>{setLoading(true);try{await enterRace()}finally{setLoading(false)}}}>{loading?<Loader2 size={17} className="spin"/>:<Flag size={17}/>}Enter race<ArrowRight size={17}/></button><small>If the grid is quiet, we’ll wait for real players. No bots or invented opponents.</small></section>:<div className="race-lobby-grid"><section className="panel room-create"><h2>Create a friends room</h2><p>Choose a time limit and share the invite code. The room host starts when everyone is ready.</p><form onSubmit={async e=>{e.preventDefault();setLoading(true);await createRoom({name,capacity,difficulty,duration,visibility:'private'});setLoading(false)}}><label>Room name<input value={name} onChange={e=>setName(e.target.value)} maxLength={60} placeholder="Our typing race"/></label><div className="form-grid"><label>Difficulty<select value={difficulty} onChange={e=>setDifficulty(e.target.value)}>{['easy','medium','hard'].map(d=><option value={d} key={d}>{difficultyName(d)}</option>)}</select></label><label>Players<select value={capacity} onChange={e=>setCapacity(Number(e.target.value))}>{[2,3,4,5,6].map(n=><option value={n} key={n}>Up to {n} players</option>)}</select></label></div><label>Race timer<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[15,30,60,120,300].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label><button className="btn primary full" disabled={loading}><Plus size={17}/>Create friends room<ArrowRight size={16}/></button></form></section><section className="panel join-room"><h3>Join your friends</h3><p>Paste the room code or invite link.</p><form onSubmit={e=>{e.preventDefault();joinRoom(code)}}><label>Room code or invite link<input required value={code} onChange={e=>setCode(e.target.value)} placeholder="Your friend’s room code"/></label><button className="btn white full">Join friends room<ArrowRight size={16}/></button></form></section></div>}</>
}

function Room({ id, user, notify, go, onSaved }: Any) {
    const [state, setState] = useState<Any>(null), [error, setError] = useState(''), [countdown, setCountdown] = useState(0), [tick, setTick] = useState(0), [finished, setFinished] = useState(false), [joining, setJoining] = useState(false);
    const ready = user && state?.players.find((x: Any) => x.user_id === user.id)?.ready, host = user && state?.room.host === user.id;
    const refresh = useCallback(() => api('rooms/' + id).then(d => { setState(d); setError(''); setCountdown(d.room.start_at ? Math.max(0, Math.ceil((d.room.start_at - d.serverNow) / 1000)) : 0); }).catch((e: Any) => setError(e.message)), [id]);
    useEffect(() => { refresh(); const timer = setInterval(() => { refresh(); setTick(t => t + 1); }, 1000); return () => clearInterval(timer); }, [refresh]);
    const room = state?.room, players = state?.players || [];const publicMatch=room?.visibility==='public';const queueSeconds=room?.auto_start_at?Math.max(0,Math.ceil((room.auto_start_at-state.serverNow)/1000)):0;
    const action = async (path: string, body: Any = {}) => {
        try {
            await api('rooms/' + id + '/' + path, body);
            refresh();
        }
        catch (e: Any) {
            notify(e.message);
        }
    };
    if (!state)
        return <><PageTitle eyebrow="YOUR NEXT DERBY" title="Meet at the starting line." description={error || 'Finding your room…'}/>{error && <section className="panel join-room"><h3>Join this room</h3><p>Room code: <kbd>{id}</kbd></p><button disabled={joining} className="btn primary" onClick={async () => {
                    setJoining(true);
                    try {
                        await api('rooms/' + id + '/join', {});
                        refresh();
                    }
                    catch (e: Any) {
                        notify(e.message);
                    }
                    finally {
                        setJoining(false);
                    }
                }}>Join room<ArrowRight size={16}/></button></section>}</>;
    if (room.state === 'cancelled')
        return <Empty icon={Flag} title="This race has closed." desc={publicMatch?'There were not enough connected players. Try Enter race again.':'The room host closed this race.'} action={<button className="btn primary" onClick={() => go('race')}>Find another race<ArrowRight size={17}/></button>}/>;
    return <><PageTitle eyebrow={room.visibility === 'private' ? 'YOUR PRIVATE DERBY' : 'THE STARTING GRID'} title={room.name} description={`${room.difficulty[0].toUpperCase() + room.difficulty.slice(1)} · ${room.duration}s timer · ${players.length}/${room.capacity} players · ${room.state === 'waiting' ? 'Waiting for the crew' : room.state === 'finished' ? 'Derby complete' : 'On the track'}`} action={<button className="btn white small" onClick={async () => { await action('leave'); go('race'); }}><LogOut size={16}/>Leave room</button>}/>{!publicMatch&&<div className="invite-bar"><span><Users size={18}/>Room code <kbd>{id}</kbd></span><button className="text-button" onClick={() => navigator.clipboard.writeText(location.origin + '/#room/' + id).then(() => notify('Room invite copied. Share it with your crew.')).catch(() => notify('Copy the room code to invite a friend.'))}><Copy size={15}/>Copy invite link</button></div>}{publicMatch&&room.state==='waiting'&&<div className="queue-status"><Loader2 size={17} className="spin"/><span>{players.length<2?'Waiting for another player…':`More players can join · starts in ${queueSeconds}s`}</span><strong>{players.length}/5 players · {room.duration}s race</strong></div>}<section className="panel racing-board"><div className="panel-heading"><h3><Flag size={19}/>{room.state === 'waiting' ? 'Your starting grid' : room.state === 'finished' ? 'Across the finish line' : 'Every keystroke moves you forward'}</h3><span className="pill">{room.state === 'waiting' ? 'Ready when your crew is' : countdown > 0 ? 'Starts in ' + countdown + '…' : 'Same passage. Fair timing.'}</span></div>{players.map((p: Any, i: number) => <div className={'player-lane ' + (p.user_id === user?.id ? 'my-lane' : '')} key={p.id}><div className="driver-info"><span className="mini-avatar" style={{ background: ['#e8f0ff', '#fbe8e3', '#fdf1cf', '#e7f4e9', '#efe8fb', '#dff4f4'][i] }}>{p.name[0]}</span><div><strong>{p.name}{p.user_id === user?.id && <small>YOU</small>}{p.user_id === room.host && <small>HOST</small>}</strong><span>{Date.now() - p.last_seen > 30000 ? 'Disconnected' : p.finished ? `${fmt(p.wpm)} WPM · ${p.accuracy.toFixed(1)}%` : room.state === 'waiting' ? p.ready ? 'Ready to race' : 'Getting ready' : `${Math.round(p.progress)}% complete`}</span></div></div><div className="driver-track"><Car color={['#248d85', '#ca956e', '#b9a46b', '#7ca18b', '#9b89ae', '#97a9a0'][i]} style={{ left: `calc(${p.progress}% - ${p.progress * .86}px)` }}/><span className="finish-marker">▧</span></div>{room.state === 'waiting' && host && p.user_id !== user.id && <button className="icon-button" aria-label={'Remove ' + p.name} onClick={() => action('kick', { userId: p.user_id })}><X size={15}/></button>}{p.finished && <CheckCircle2 size={21} className="success-text"/>}</div>)}{room.state === 'waiting' && Array.from({ length: Math.max(0, room.capacity - players.length) }, (_, i) => <div className="empty-lane" key={i}><span className="empty-avatar"><Plus size={19}/></span><span>A spot for a friendly rival.</span></div>)}{room.state === 'waiting' && !publicMatch && <div className="lobby-actions"><button className={'btn ' + (ready ? 'white' : 'primary')} onClick={() => action('ready', { ready: !ready })}>{ready ? <CheckCheck size={18}/> : <Flag size={18}/>} {ready ? 'Ready — click to undo' : 'I’m ready to race'}</button>{host && <button className="btn primary" onClick={() => action('start')} disabled={players.length < 2 || players.some((p: Any) => !p.ready)}><Play size={17}/>Start the derby</button>}<span>{players.length < 2 ? 'Invite one more driver to start.' : 'Every connected driver must be ready.'}</span></div>}</section>
 {countdown > 0 && <div className="countdown-panel"><span>Fingers on the starting line.</span><strong key={countdown}>{countdown}</strong><p>Everyone gets the same passage. The race begins together.</p></div>}
 {room.state === 'racing' && !countdown && !finished && <Typing compact options={{duration:room.duration}} key={id} mode="race" roomId={id} roomStart={room.start_at} roomPassage={state.passage} user={user} notify={notify} go={go} onSaved={onSaved} onRaceDone={() => { setFinished(true); refresh(); }}/>}
 {(room.state === 'finished' || finished) && <section className="panel race-results"><div className="panel-heading"><h3><Trophy size={21}/>The finish line</h3><span className="pill">{room.state!=='finished'&&players.some((p:Any)=>!p.finished)?'Other players are still typing':'Final results'}</span></div><div className="table-scroll"><table><thead><tr><th>Place</th><th>Driver</th><th>Speed</th><th>Accuracy</th><th>Time</th><th>Progress</th></tr></thead><tbody>{[...players].sort((a: Any, b: Any) => (b.wpm??-1)-(a.wpm??-1)||(b.accuracy??0)-(a.accuracy??0)||(a.elapsed??Infinity)-(b.elapsed??Infinity)).map((p: Any, i: number) => <tr key={p.id}><td>{p.finished ? '#' + (i + 1) : '—'}</td><td><strong>{p.name}</strong></td><td>{p.finished ? fmt(p.wpm) + ' WPM' : room.state==='finished'?'No saved result':'On track'}</td><td>{p.finished ? p.accuracy.toFixed(1) + '%' : '—'}</td><td>{p.finished ? p.elapsed.toFixed(1) + 's' : '—'}</td><td>{Math.round(p.progress)}%</td></tr>)}</tbody></table></div><div className="result-buttons"><button className="btn primary" onClick={() => go('friends')}>Set up a rematch<RotateCcw size={16}/></button><button className="btn white" onClick={() => go('dashboard')}>View my progress<BarChart3 size={16}/></button></div></section>}
 {error && <div className="alert">Connection interrupted. Reconnecting… {error}</div>}
 </>;
}
function Leaderboard({ notify, go }: Any) {
    const [period, setPeriod] = useState('all'), [mode, setMode] = useState('all'), [difficulty, setDifficulty] = useState('easy'), [duration, setDuration] = useState(60);
    const [entries, setEntries] = useState<Any[]>([]), [onlineUsers, setOnlineUsers] = useState<Any[]>([]), [onlineCount, setOnlineCount] = useState(0), [busy, setBusy] = useState(true);
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const data = await api(`leaderboard?period=${period}&mode=${mode}&difficulty=${difficulty}&duration=${duration}`);
                if (!alive) return;
                setEntries(data.entries || []); setOnlineUsers(data.onlineUsers || []); setOnlineCount(data.onlineCount || 0);
            } catch (error: Any) { if (alive) notify(error.message); }
            finally { if (alive) setBusy(false); }
        };
        setBusy(true); load();
        const timer = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
        return () => { alive = false; window.clearInterval(timer); };
    }, [period, mode, difficulty, duration, notify]);
    return <>
        <PageTitle eyebrow="WORLDWIDE KEYDERBY RANKINGS" title="Top 20 typists." description="Compare real practice, timed test and race results. Players from any country can participate, with explicit public consent." action={<button className="btn primary" onClick={() => go('settings')}>Join rankings<ArrowRight size={16}/></button>}/>
        <section className="panel leaderboard-panel">
            <div className="rankings-summary">
                <div><span className="eyebrow muted">PUBLIC USERS ONLINE</span><strong>{onlineCount}</strong><small>Recently active, last 2 minutes</small></div>
                <div><span className="eyebrow muted">TOP PLAYERS</span><strong>20</strong><small>Up to 20 qualifying real players</small></div>
                <div><span className="eyebrow muted">LOCATION</span><strong>Worldwide</strong><small>Optional self-reported countries</small></div>
            </div>
            <div className="leaderboard-toolbar rankings-toolbar">
                <div className="segmented">{[['all','All'],['practice','Practice'],['test','Timed test'],['race','Race']].map(([m,label]) => <button key={m} className={mode===m?'active':''} onClick={() => setMode(m)}>{label}</button>)}</div>
                <div className="segmented">{['daily','weekly','monthly','all'].map(p => <button key={p} className={period===p?'active':''} onClick={() => setPeriod(p)}>{p==='all'?'All time':p[0].toUpperCase()+p.slice(1)}</button>)}</div>
                <div className="inline-filters">
                    <label>Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['easy','medium','hard'].map(d => <option key={d} value={d}>{difficultyName(d)}</option>)}</select></label>
                    <label>Duration<select value={duration} onChange={e => setDuration(Number(e.target.value))}>{[15,30,60,120,300].map(n => <option key={n} value={n}>{n} seconds</option>)}</select></label>
                </div>
            </div>
            {busy ? <Empty icon={Loader2} title="Loading global rankings…" desc="Checking qualifying sessions."/> :
             entries.length ? <div className="table-scroll"><table><thead><tr><th>RANK</th><th>PLAYER</th><th>COUNTRY</th><th>BEST SPEED</th><th>ACCURACY</th><th>TOTAL SESSIONS</th><th>TOTAL TIME</th><th>STATUS</th></tr></thead><tbody>
                {entries.map((e: Any, i: number) => <tr key={i}><td><strong className={'rank rank-'+i}>#{i+1}</strong></td><td><div className="driver-cell"><span className="mini-avatar">{e.name?.[0] || '?'}</span><span><strong>{e.name}</strong><small className="ranking-driver-id">{e.publicId}</small></span></div></td><td>{e.countryCode ? <span className="country-with-flag"><span aria-hidden="true">{countryFlag(e.countryCode)}</span>{countryName(e.countryCode)}</span> : e.country || 'Not specified'}</td><td><strong className="score-blue">{fmt(e.wpm)}</strong> WPM</td><td>{Number(e.accuracy || 0).toFixed(1)}%</td><td>{e.sessions}</td><td>{Number(e.minutes || 0).toFixed(1)} min</td><td>{e.online ? <span className="online-status"><span className="live-dot"/>Online</span> : 'Offline'}</td></tr>)}
             </tbody></table></div> :
             <Empty icon={Trophy} title="No qualifying players yet." desc="No placeholder players or invented scores. Choose a different filter, or opt in and complete a qualifying session." action={<button className="btn primary" onClick={() => go('settings')}>Opt in from Settings<ArrowRight size={16}/></button>}/>}
        </section>
        <section className="panel public-online-panel">
            <div className="panel-heading"><h3><Users size={19}/>Online players</h3><span className="pill">{onlineCount} public now</span></div>
            <p>Named players active within 2 minutes who opted into public rankings. Private users and guests are never listed.</p>
            {onlineUsers.length ? <div className="online-users">{onlineUsers.map((p: Any, i: number) => <span className="online-user" key={i}><span className="live-dot"/><strong>{p.name}</strong><small>{p.publicId}</small>{p.countryCode ? <small>{countryFlag(p.countryCode)} {countryName(p.countryCode)}</small> : p.country && <small>{p.country}</small>}</span>)}</div> : <p className="online-empty">No public profiles are online right now.</p>}
        </section>
        <div className="fairness-note"><Shield size={23}/><div><h3>Fair rankings, privacy first.</h3><p>Only public, opt-in profiles appear. A qualifying session needs at least 150 typed characters, 15 seconds, 90% accuracy, an acceptable raw speed and a completed timer. Standard practice, timed tests and races are ranked by best corrected WPM, comparing the same difficulty and duration. Online status is an estimate, not a continuous connection. Country is optional and self-reported; automated typing can never be completely ruled out.</p><button className="text-button" onClick={() => go('settings')}>Manage privacy and country<ArrowRight size={15}/></button></div></div>
    </>;
}
function Library({ go, notify }: Any) { const [search, setSearch] = useState(''), [difficulty, setDifficulty] = useState('mixed'), [category, setCategory] = useState(''), [offset, setOffset] = useState(0), [data, setData] = useState<Any>({ passages: [], categories: [], total: 0 }), [busy, setBusy] = useState(false); useEffect(() => { const timer = setTimeout(() => { setBusy(true); api(`passages?search=${encodeURIComponent(search)}&difficulty=${difficulty}&category=${encodeURIComponent(category)}&offset=${offset}&limit=12`).then(setData).catch((e: Any) => notify(e.message)).finally(() => setBusy(false)); }, 200); return () => clearTimeout(timer); }, [search, difficulty, category, offset, notify]); return <><PageTitle eyebrow="WORDS FOR EVERY ROAD" title="Find your next good passage." description="4,000 published passages, including 1,000 new additions. Browse and search any text."/><div className="library-toolbar panel"><label className="search-input"><Search size={18}/><input aria-label="Search passages" placeholder="Search a title, topic, or word…" value={search} onChange={e => { setSearch(e.target.value); setOffset(0); }}/></label><select aria-label="Filter difficulty" value={difficulty} onChange={e => { setDifficulty(e.target.value); setOffset(0); }}>{['mixed', 'easy', 'medium', 'hard'].map(d => <option key={d} value={d}>{d === 'mixed' ? 'All difficulties' : difficultyName(d)}</option>)}</select><select aria-label="Filter category" value={category} onChange={e => { setCategory(e.target.value); setOffset(0); }}><option value="">All categories</option>{data.categories.map((c: string) => <option key={c}>{c}</option>)}</select></div><div className="library-summary"><span>{data.total} published passages in this view</span>{busy && <Loader2 size={16} className="spin"/>}</div><div className="library-grid">{data.passages.map((p: Any) => <article className="panel passage-card" key={p.id}><div><span className="passage-number">{p.displayId}</span><span className={'difficulty ' + p.difficulty}>{difficultyName(p.difficulty)}</span><span className="muted">{p.words} words</span></div><span className="eyebrow muted">{p.category}</span><h3>{p.title}</h3><p>{p.text.slice(0, 180)}…</p>{p.id.startsWith('CLASSIC') && <span className="classic-label">Classic excerpt · Source edition available</span>}<button className="text-button" onClick={() => go('practice', { passageId: p.id, difficulty: p.difficulty, duration: 60 })}>Practice this passage<ArrowRight size={16}/></button></article>)}</div>{!data.passages.length && !busy && <Empty icon={Search} title="No passages in this lane." desc="Try another category or a shorter search."/>}<div className="pagination"><button className="btn white small" disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 12))}>Previous</button><span>Page {Math.floor(offset / 12) + 1}</span><button className="btn white small" disabled={offset + 12 >= data.total} onClick={() => setOffset(offset + 12)}>Next<ArrowRight size={15}/></button></div></>; }
const infoContent: Any = {
    'About': { title: 'A little better, one keystroke at a time.', intro: 'Keyderby is a place to practice typing, race with friends, and see your progress take shape.', sections: [['Practice that meets you where you are', 'Start with familiar words, explore a timed test, or challenge yourself with more demanding passages. Every lap is a chance to find a steadier rhythm.'], ['Friendly competition, real people', 'Create a room, invite your crew, and race the same passage together. Empty rooms stay empty until real drivers arrive.'], ['Your progress belongs to you', 'Profiles do not require email or a password. A secure browser session keeps you connected, and a private recovery code can restore your profile.']] },
    'How it works': { title: 'Your first lap is a few keys away.', intro: 'No email required. Start as a guest, then give your progress a name when you are ready.', sections: [['01 — Pick your lane', 'Choose solo passages, timed tests, or custom text. Select the difficulty and duration that feel right.'], ['02 — Find your rhythm', 'Press Start practice, then type the displayed text. Your first accepted keystroke starts the timer. Green characters match; red characters need attention.'], ['03 — Learn from the lap', 'Your result includes corrected WPM, raw WPM, final accuracy, and first-attempt accuracy. Review the characters you missed and practice again.'], ['04 — Bring your crew', 'Create a private room and share its invite code. At least two connected drivers must be ready before the host starts the shared countdown.']] },
    'Typing guide': { title: 'Find the rhythm before the speed.', intro: 'A comfortable setup and a little consistency can make practice feel easier.', sections: [['Start with a comfortable position', 'Keep your shoulders relaxed, your feet supported, and your screen easy to read. Take breaks when you need them. Stop if typing causes discomfort.'], ['Keep your eyes on the words', 'Use the bumps on F and J to orient your hands. Try to look at the target text rather than searching for every key. Familiarity grows with repetition.'], ['Let accuracy lead', 'Choose a pace you can control. Practice common trouble spots in short sessions before increasing difficulty. Compare like-for-like test durations.'], ['Know what your numbers mean', 'Corrected WPM is matching character positions divided by five and by elapsed minutes. Raw WPM counts all currently typed characters. Final accuracy measures the current text; first-attempt accuracy also remembers errors corrected with backspace.'], ['Make practice sustainable', 'A few focused minutes can be more useful than a long, distracted session. Use your saved results to notice patterns, then choose one small next goal.']] },
    'FAQ': { title: 'A few answers for the road.', intro: 'The practical details before your next lap.', sections: [['Do I need Gmail or a password?', 'No. Guest access starts immediately. A permanent typing profile needs a display name, and its ID is generated automatically. A recovery code is optional.'], ['Can I recover a profile with a public ID?', 'No. Public IDs are labels, not account keys. Restore access with a saved recovery code. Without both a session and a recovery code, restoration may be impossible.'], ['Why is my result missing from the leaderboard?', 'Global rankings require a permanent public profile with explicit opt-in, a completed standard practice, timed test or race attempt, at least 150 typed characters, 15 seconds of typing, and at least 90% accuracy. Unusually high raw speed is excluded. Rankings separate difficulty and duration.'], ['Are the other drivers bots?', 'No. Keyderby does not fill rooms with simulated people. A quiet lobby is shown honestly. Invite someone or wait for another driver.'], ['When do daily challenges change?', 'Daily passages rotate at midnight UTC, using the server date. Attempts remain available in your personal results.'], ['Is all planned content ready?', 'The library contains 4,000 distinct passages, including 1,000 additions. It combines 60 original Keyderby passages with 3,940 classic-source excerpts. Source editions and licenses are available from Text sources. Automated validation and sampled review have been completed; full editorial review is still pending.']] },
    'Privacy policy': { title: 'Your progress. Your choices.', intro: 'This notice describes the current Keyderby build. Updated 1 November 2026.', sections: [['What is stored', 'The server stores your display name, generated ID, preferences, optional self-reported country, saved typing results, goals, room participation and a recent activity timestamp. Session tokens and recovery codes are stored as hashes.'], ['What other people can see', 'Room participants can see each other’s display names and race progress. Public rankings show opt-in display names, eligible scores, aggregate session count/time, optional self-reported country and online status estimated from recent activity. Other profiles are hidden from the public rankings. Recovery credentials and private personal analytics are not shared.'], ['Custom practice text', 'Custom text is used to run your session. On result submission, the text snapshot and entered custom text are replaced with an omission marker; character-level custom-text mistakes are not retained. Unfinished custom attempts are removed when cancelled.'], ['Session cookies', 'A first-party HttpOnly cookie links your browser to your account for up to 30 days. This cookie is necessary for saved progress. There are no advertising trackers in this build.'], ['Export and deletion', 'Use My Profile to export your personal data or delete your profile, results, and goals. Deleted profiles are marked inactive and cannot authenticate. Room results refer to an anonymized deleted profile. Backup scheduling is a hosting configuration.'], ['Questions or concerns', 'Use My Profile to export or remove your own saved results. Keep recovery codes private.']] },
    'Terms of use': { title: 'A clear starting line for everyone.', intro: 'Practical rules for using this development build. Updated 1 November 2026.', sections: [['Use the platform responsibly', 'Practice, learn, and compete respectfully. Do not interfere with the service, attempt to access another account, scrape private information, or bypass access controls.'], ['Keep competition meaningful', 'Do not submit automated keystrokes as your own manual typing, paste race text, manipulate timing, or impersonate another driver. Scores may be excluded when eligibility checks fail.'], ['Your account key is private', 'Keep your recovery code safe. Anyone who has it may be able to restore your profile. Public IDs and usernames do not grant account ownership.'], ['Content and availability', 'Submit only text you have permission to use. This is a development build with known limitations; availability, load capacity, backups, and comprehensive competitive integrity have not been established for public production use.'], ['Automatic protection', 'Rate limits, server timing and score validation apply automatically to every participant.']] },
    'Community rules': { title: 'Good rivals. Better community.', intro: 'Make the track a place people want to return to.', sections: [['Keep it kind', 'Use respectful display names and room names. Do not harass, threaten, discriminate, or share another person’s private details.'], ['Race fairly', 'Type for yourself. Let the result reflect your own practice. Friendly competition works best when everybody has the same starting line.'], ['Share with care', 'Send room invites only to people you want to join. Never share your recovery code in a room, username, report, or public post.'], ['Speak up when something is wrong', 'Keep your recovery code private. Only share room invite codes with the people you want to race.']] }
};
function InfoPage({ topic, go }: Any) { const c = infoContent[topic] || infoContent['Typing guide']; return <><PageTitle eyebrow="KEYDERBY GUIDE" title={c.title} description={c.intro}/><article className="panel info-article simple-info">{c.sections.map(([title, body]: Any) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</article></>; }
const sourceLicenseNotice = 'This eBook is for the use of anyone anywhere in the United States and most other parts of the world at no cost and with almost no restrictions whatsoever. You may copy it, give it away or re-use it under the terms of the Project Gutenberg License included with this eBook or online at www.gutenberg.org. If you are not located in the United States, you will have to check the laws of the country where you are located before using this eBook.';
function Sources() { const [sources, setSources] = useState<Any[]>([]); useEffect(() => { fetch('/sources/catalog.json').then(r => r.json()).then((d: any) => setSources(d)).catch(() => { }); }, []); return <><PageTitle eyebrow="WORDS WITH A CLEAR ORIGIN" title="The stories behind your keystrokes." description="60 original Keyderby passages and 2,940 non-overlapping excerpts from classic source editions. Every passage has a provenance record."/><section className="panel sources-intro"><h3>Originals, classics, and transparent provenance.</h3><p>Original Keyderby passages were written for this platform. Classic excerpts retain their source author and title. Source editions are listed as public domain in the USA by their publisher; applicability outside the USA depends on local law. Their complete downloaded editions, including full license notices, are available below at no charge.</p><p>{sourceLicenseNotice}</p><p>Excerpts use contiguous, complete sentences. Whitespace, curly quotation marks, and dashes are normalized for keyboard practice. Automated checks cover duplicate text, word counts, metadata, difficulty length limits, and a basic content screen. A sampled editorial review was performed; this does not establish that every passage has received a full individual editorial review.</p><a className="text-button" href="https://www.gutenberg.org/policy/license" target="_blank" rel="noreferrer">Read the full Project Gutenberg license<ExternalLink size={15}/></a></section><div className="library-grid mt">{sources.map(s => <article className="panel source-card" key={s.id}><span className="eyebrow muted">CLASSIC SOURCE EDITION</span><h3>{s.title}</h3><p>{s.author}</p><div><a className="text-button" href={s.file} target="_blank" rel="noreferrer">Original text & full license<Download size={15}/></a><a className="text-button" href={s.source} target="_blank" rel="noreferrer">Source catalog<ExternalLink size={15}/></a></div></article>)}</div></>; }
