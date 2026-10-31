export const DEFAULT_ORIGINS=['http://127.0.0.1:4173','http://localhost:4173','http://127.0.0.1:5173','http://localhost:5173'];
export function validateConfig({port=8787,host='127.0.0.1',production=false,origins=production?[]:DEFAULT_ORIGINS,...rest}={}){
 if(typeof production!=='boolean')throw Error('production must be boolean');
 if(!Number.isInteger(port)||port<0||port>65535)throw Error('Invalid PORT');
 if(typeof host!=='string'||!['127.0.0.1','::1','localhost',...(production?['0.0.0.0','::']:[])].includes(host))throw Error('Local mode requires loopback HOST');
 if(!Array.isArray(origins)||!origins.length)throw Error('Explicit ALLOWED_ORIGINS required');
 for(const origin of origins){let u;try{u=new URL(origin);}catch{throw Error('Invalid allowed origin');}if(typeof origin!=='string'||u.origin!==origin||u.username||u.password||!['https:',...(production?[]:['http:'])].includes(u.protocol)||u.hostname.includes('*'))throw Error('Allowed origins must be exact canonical HTTPS origins in production');}
 return {...rest,port,host,production,origins:[...new Set(origins)]};
}
export function readConfig(env=process.env){
 const mode=env.ROOM_SERVER_MODE??'local';if(!['local','production'].includes(mode))throw Error('ROOM_SERVER_MODE must be local or production');
 const production=mode==='production';
 if(env.PORT!==undefined&&!/^[0-9]+$/.test(env.PORT))throw Error('Invalid PORT');
 const options={production,port:Number(env.PORT??8787),host:env.HOST??'127.0.0.1',compression:env.WS_COMPRESSION==='1'};
 if(env.ALLOWED_ORIGINS!==undefined)options.origins=env.ALLOWED_ORIGINS.split(',');
 return validateConfig(options);
}
