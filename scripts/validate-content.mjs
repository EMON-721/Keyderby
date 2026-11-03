import fs from 'node:fs';
import assert from 'node:assert/strict';

// Validate every record that the live Worker imports, not just a UI counter.
const read = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));
const original = read('content/passages.json');
const additionsA = read('content/passages-extra-1.json');
const additionsB = read('content/passages-extra-2.json');
const originalIndex = read('content/passage-index.json');
const addedIndex = read('content/passage-index-extra.json');
const all = [...original, ...additionsA, ...additionsB];
const labels = { ...originalIndex, ...addedIndex };
assert.equal(original.length, 3000, 'Original 3,000 passages must remain intact');
assert.equal(additionsA.length, 500, 'Additional passage batch 1 must contain 500 texts');
assert.equal(additionsB.length, 500, 'Additional passage batch 2 must contain 500 texts');
assert.equal(all.length, 4000, 'The entire 4,000 passage corpus is required');
assert.equal(Object.keys(originalIndex).length, original.length, 'Original passage labels missing');
assert.equal(Object.keys(addedIndex).length, 1000, 'Additional passage labels missing');
assert.equal(new Set(all.map(p => p.id)).size, all.length, 'Duplicate passage IDs');
assert.equal(new Set(all.map(p => p.text)).size, all.length, 'Duplicate passage bodies');
assert.equal(Object.keys(labels).length, all.length, 'Incorrect passage label count');
assert.equal(new Set(Object.values(labels).map(p => p.displayId)).size, all.length, 'Duplicate display labels');
const ranges = { easy: [40,100], medium: [100,180], hard: [150,300] };
const counts = { easy: 0, medium: 0, hard: 0 };
const extraCounts = { easy: 0, medium: 0, hard: 0 };
for (const p of all) {
    assert.ok(ranges[p.difficulty], 'Invalid difficulty: ' + p.id);
    const count = p.text.trim().split(/\s+/).length;
    assert.equal(p.words, count, 'Incorrect word count: ' + p.id);
    assert.ok(count >= ranges[p.difficulty][0] && count <= ranges[p.difficulty][1], 'Word count out of bounds: ' + p.id);
    assert.ok(p.id && p.title && p.category && p.provenance && p.text, 'Missing passage content: ' + p.id);
    assert.equal(p.status, 'published');
    const label = labels[p.id];
    assert.ok(label?.number >= 1, 'Missing number: ' + p.id);
    const prefix = { easy: 'E', medium: 'M', hard: 'H' }[p.difficulty];
    assert.equal(label.displayId, prefix + String(label.number).padStart(4, '0'), 'Incorrect display label: ' + p.id);
    counts[p.difficulty]++;
    if (p.id.startsWith('EXPAND-')) {
        extraCounts[p.difficulty]++;
        assert.ok(label.number > 1000, 'New ID may not reuse an older number');
        const provenance = JSON.parse(p.provenance);
        assert.equal(provenance.kind, 'public-domain-excerpt');
        assert.ok(provenance.originalFile?.startsWith('/sources/pg'), 'Source edition missing: ' + p.id);
    } else assert.ok(label.number <= 1000, 'Old numbering changed: ' + p.id);
}
assert.equal(Object.values(extraCounts).reduce((a,b) => a + b,0), 1000, 'All 1,000 added passage records are required');
assert.ok(Object.values(counts).every(n => n >= 1000), 'Previously available difficulty levels must not shrink');
const report = {
    total: all.length, original: original.length, added: 1000,
    counts, extraCounts,
    uniqueTexts: new Set(all.map(p=>p.text)).size,
    uniqueIds: new Set(all.map(p=>p.id)).size,
    uniqueDisplayLabels: new Set(Object.values(labels).map(p=>p.displayId)).size,
    structuralValidation: 'passed', requiredTotal: 4000,
    countAndStructureComplete: true, remaining: 0,
    note: 'Individual editorial review and production Cloudflare D1 sync must be separately verified.'
};
console.log(JSON.stringify(report,null,2));
fs.writeFileSync('docs/content-validation.json', JSON.stringify(report,null,2) + '\n');
