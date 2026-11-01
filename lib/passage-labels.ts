import index from '../content/passage-index.json';
export function labelFor(id:string|null){return id&&(index as Record<string,{number:number;displayId:string}>)[id]||{number:null,displayId:null}}
