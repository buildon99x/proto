// Keep the request alive through the gateway's final durable disconnect/release.
// A socket's close event alone does not mean asynchronous authority work is done.
export async function serveGatewaySocket(gateway,ws,{cleanupTimeoutMs=20000}={}){
 gateway.attach(ws);
 try{
  if(ws.readyState!==3)await new Promise(resolve=>ws.once('close',resolve));
 }finally{
  let deadline;
  try{
   await Promise.race([
    gateway.flush(),
    new Promise((_,reject)=>{deadline=setTimeout(()=>reject(Object.assign(new Error('Gateway cleanup exceeded its deadline'),{code:'GATEWAY_CLEANUP_TIMEOUT'})),cleanupTimeoutMs);})
   ]);
  }finally{clearTimeout(deadline);}
 }
}
