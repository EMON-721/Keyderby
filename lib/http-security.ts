export const MAX_JSON_BYTES=65536;
export class HttpFailure extends Error{constructor(public status:number,message:string){super(message)}}
export async function readJson(request:Request){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new HttpFailure(415,'Use an application/json request.');
 if(Number(request.headers.get('content-length')||0)>MAX_JSON_BYTES)throw new HttpFailure(413,'Request is too large.');
 if(!request.body)throw new HttpFailure(400,'A JSON object is required.');
 const reader=request.body.getReader();let length=0;const chunks:Uint8Array[]=[];
 while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.byteLength;if(length>MAX_JSON_BYTES){await reader.cancel();throw new HttpFailure(413,'Request is too large.')}chunks.push(chunk.value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 let value;try{value=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new HttpFailure(400,'A valid JSON object is required.')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpFailure(400,'A JSON object is required.');return value as Record<string,any>;
}
export function validateOrigin(request:Request){
 const origin=request.headers.get('origin');
 const site=request.headers.get('sec-fetch-site');
 if(site==='cross-site')throw new HttpFailure(403,'Cross-site requests are not allowed.');
 if(origin){let parsed;try{parsed=new URL(origin)}catch{throw new HttpFailure(403,'Request origin is not allowed.')}if(parsed.origin!==new URL(request.url).origin)throw new HttpFailure(403,'Request origin is not allowed.')}
}
export function secureResponse(response:Response,nonce?:string){
 const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=(), usb=()');
 if(nonce)headers.set('Content-Security-Policy',`default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com`);
 return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
