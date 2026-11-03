import passages from '../content/passages.json';
import additionalOne from '../content/passages-extra-1.json';
import additionalTwo from '../content/passages-extra-2.json';
const fullCorpus = [...passages, ...additionalOne, ...additionalTwo];
import { db, one } from './server';
// Versioned, public practice content only. No user records or credentials belong here.
let initialization:Promise<void>|undefined;
export function ensureCorpus(){
 if(!initialization)initialization=(async()=>{
  const stored=await one("SELECT count(*) n FROM passages WHERE status='published'");
  if(stored.n>=fullCorpus.length)return;
  const statements=[];
  for(let i=0;i<fullCorpus.length;i+=100){
   const batch=fullCorpus.slice(i,i+100);
   statements.push(db().prepare(`INSERT OR IGNORE INTO passages(id,title,text,difficulty,category,words,status,created,updated,provenance) SELECT json_extract(value,'$.id'),json_extract(value,'$.title'),json_extract(value,'$.text'),json_extract(value,'$.difficulty'),json_extract(value,'$.category'),json_extract(value,'$.words'),json_extract(value,'$.status'),json_extract(value,'$.created'),json_extract(value,'$.updated'),json_extract(value,'$.provenance') FROM json_each(?)`).bind(JSON.stringify(batch)));
  }
  await db().batch(statements);
 })().catch(error=>{initialization=undefined;throw error});
 return initialization;
}
