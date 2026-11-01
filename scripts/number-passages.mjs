import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('content/passages.json','utf8'));const counts={easy:0,medium:0,hard:0},index={};
for(const passage of rows){const number=++counts[passage.difficulty];index[passage.id]={number,displayId:({easy:'E',medium:'M',hard:'H'}[passage.difficulty])+String(number).padStart(4,'0')};}
fs.writeFileSync('content/passage-index.json',JSON.stringify(index));console.log(counts);
