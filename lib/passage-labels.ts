import index from '../content/passage-index.json';
import extra from '../content/passage-index-extra.json';
const allLabels: Record<string,{number:number;displayId:string}> = {...index,...extra};
export function labelFor(id:string|null){return id&&allLabels[id]||{number:null,displayId:null}}
