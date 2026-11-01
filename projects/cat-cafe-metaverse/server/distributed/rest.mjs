// Server-only native REST transport. No retry: an ambiguous write must be resolved
// by the fenced state machine, never repeated blindly. Metrics exclude HTTP headers.
export function createRedisTransport({url,token,fetchImpl=fetch,timeoutMs=3000,maxBytes=4*1024*1024}={}){
 const endpoint=new URL(url);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||endpoint.pathname!=='/'||typeof token!=='string'||!token)throw Error('Invalid private Redis configuration');
 const metrics={requests:0,bytesOut:0,bytesIn:0,uncertain:0,scriptMisses:0};
 async function command(args){
  if(!Array.isArray(args)||args.length<1||args.some(v=>!['string','number'].includes(typeof v)))throw Error('Invalid Redis command');
  const body=JSON.stringify(args);if(Buffer.byteLength(body)>maxBytes)throw Error('Redis request too large');
  metrics.requests++;metrics.bytesOut+=Buffer.byteLength(body);
  let knownMiss;
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
   const response=await fetchImpl(endpoint.href,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body,signal:abort.signal,redirect:'error'});
   const reader=response.body.getReader();let bytes=0;const chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;metrics.bytesIn+=value.byteLength;if(bytes>maxBytes){await reader.cancel();throw Error('oversized');}chunks.push(Buffer.from(value));}
   const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   // Only this authoritative reply proves EVALSHA did not execute any script.
   if(args[0]==='EVALSHA'&&[200,400].includes(response.status)&&data&&typeof data.error==='string'&&/^NOSCRIPT(?:\s|$)/.test(data.error)&&!Object.hasOwn(data,'result')){
    knownMiss=Object.assign(new Error('Redis script cache miss'),{code:'REDIS_NOSCRIPT',requestBytes:Buffer.byteLength(body),responseBytes:bytes});
    metrics.scriptMisses++;throw knownMiss;
   }
   if(!response.ok||!data||typeof data!=='object'||!Object.hasOwn(data,'result')||Object.hasOwn(data,'error'))throw Error('provider');
   return data.result;
  }catch(error){if(knownMiss&&error===knownMiss)throw knownMiss;metrics.uncertain++;throw Object.assign(new Error('Store unavailable; outcome may be uncertain'),{code:'STORE_UNAVAILABLE'});}finally{clearTimeout(timer);}
 }
 return {command,metrics};
}
