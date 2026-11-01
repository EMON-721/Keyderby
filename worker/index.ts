import {secureResponse} from "../lib/http-security";
import handler from "vinext/server/fetch-handler";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    let path:string;
    try{path=decodeURIComponent(new URL(request.url).pathname)}catch{return secureResponse(new Response('Bad request',{status:400}))}
    if(/(?:^|\/)\.(?:git|env|dev\.vars|wrangler|sites-runtime)|\.(?:sqlite3?|db|log|pem|key|map)(?:$|\/)|^\/(?:drizzle|backups|logs|content)\//i.test(path))return secureResponse(new Response('Not found',{status:404}));
    if(!['GET','HEAD'].includes(request.method)&&!path.startsWith('/api/'))return secureResponse(new Response('Method not allowed',{status:405}));
    let response=await handler.fetch(request, env, ctx);
    let nonce:string|undefined;
    if(!import.meta.env.DEV&&response.headers.get('content-type')?.includes('text/html')){
      nonce=Array.from(crypto.getRandomValues(new Uint8Array(18)),x=>x.toString(16).padStart(2,'0')).join('');
      response=new HTMLRewriter().on('script',{element(element:Element){element.setAttribute('nonce',nonce!)}}).transform(response);
    }
    const safe=secureResponse(response,nonce);
    if(path.startsWith('/api/'))safe.headers.set('Cache-Control','no-store');
    if(new URL(request.url).protocol==='https:')safe.headers.set('Strict-Transport-Security','max-age=31536000');
    return safe;
  },
};

export default worker;
