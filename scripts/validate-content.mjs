import fs from 'node:fs';import assert from 'node:assert/strict';
const passages=JSON.parse(fs.readFileSync('content/passages.json','utf8'));
assert.equal(new Set(passages.map(p=>p.id)).size,passages.length,'Duplicate passage ID');assert.equal(new Set(passages.map(p=>p.text)).size,passages.length,'Duplicate passage text');
const index=JSON.parse(fs.readFileSync('content/passage-index.json','utf8'));
assert.equal(Object.keys(index).length,passages.length,'Missing passage numbers');
assert.equal(new Set(Object.values(index).map(p=>p.displayId)).size,passages.length,'Duplicate passage numbers');
for(const p of passages){assert.ok(index[p.id]?.number>=1&&index[p.id]?.number<=1000,'Invalid passage number');assert.ok(index[p.id].displayId.startsWith({easy:'E',medium:'M',hard:'H'}[p.difficulty]),'Wrong number prefix')}
const ranges={easy:[40,100],medium:[100,180],hard:[150,300]},counts={easy:0,medium:0,hard:0};
for(const p of passages){const words=p.text.trim().split(/\s+/).length;assert.equal(words,p.words,'Incorrect word count: '+p.id);assert.ok(p.text&&p.title&&p.category&&p.provenance,'Missing metadata');assert.ok(ranges[p.difficulty],'Invalid difficulty');assert.ok(words>=ranges[p.difficulty][0]&&words<=ranges[p.difficulty][1],`Word count outside difficulty bounds: ${p.id} (${words})`);assert.equal(p.status,'published');counts[p.difficulty]++}
const report={total:passages.length,counts,uniqueTexts:new Set(passages.map(p=>p.text)).size,structuralValidation:'passed',requiredTotal:3000,countAndStructureComplete:Object.values(counts).every(n=>n>=1000),remaining:3000-passages.length};console.log(JSON.stringify(report,null,2));fs.writeFileSync('docs/content-validation.json',JSON.stringify(report,null,2));if(process.argv.includes('--acceptance')&&!report.countAndStructureComplete)process.exitCode=1;
