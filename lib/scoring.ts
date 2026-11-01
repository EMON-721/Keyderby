export const chars = (s: string) => Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s), x => x.segment);
export function score(target: string, typed: string, seconds: number, strokes = chars(typed).length, wrong = 0) {
    const a = chars(target), b = chars(typed);
    let correct = 0;
    const mistakes: {
        expected: string;
        typed: string;
        position: number;
        kind: string;
    }[] = [];
    b.forEach((c, i) => { if (c === a[i])
        correct++;
    else
        mistakes.push({ expected: a[i] ?? '', typed: c, position: i, kind: /\d/.test(a[i] ?? '') ? 'Number' : /[^a-zA-Z0-9\s]/.test(a[i] ?? '') ? 'Punctuation' : c.toLowerCase() === (a[i] ?? '').toLowerCase() ? 'Capitalization' : c === ' ' || a[i] === ' ' ? 'Spacing' : 'Letter' }); });
    const minutes = Math.max(seconds, 0.001) / 60;
    return { wpm: correct / 5 / minutes, raw: b.length / 5 / minutes, accuracy: b.length ? correct / b.length * 100 : 100, firstAccuracy: strokes ? Math.max(0, (strokes - wrong) / strokes * 100) : 100, correct, errors: b.length - correct, corrected: Math.max(0, wrong - (b.length - correct)), elapsed: seconds, mistakes, completion: a.length ? Math.min(100, b.length / a.length * 100) : 0 };
}
export function badges(results: any[]) { const completed = results.filter(r => r.finished); const best = Math.max(0, ...completed.map(r => r.wpm || 0)); return [{ name: 'Off the starting line', description: 'Finish your first session', icon: 'flag', earned: completed.length >= 1 }, { name: 'Finding your rhythm', description: 'Complete 10 typing sessions', icon: 'keyboard', earned: completed.length >= 10 }, { name: 'Speed explorer', description: 'Reach 30 WPM in a 30s+ test', icon: 'zap', earned: completed.some(r => r.wpm >= 30 && r.elapsed >= 30) }, { name: 'Cruise control', description: 'Reach 50 WPM in a 30s+ test', icon: 'car', earned: completed.some(r => r.wpm >= 50 && r.elapsed >= 30) }, { name: 'Precision driver', description: '95% accuracy over 150 characters', icon: 'target', earned: completed.some(r => r.accuracy >= 95 && (r.typed?.length || 0) >= 150) }, { name: 'Century club', description: 'Complete 100 sessions', icon: 'award', earned: completed.length >= 100 }]; }
