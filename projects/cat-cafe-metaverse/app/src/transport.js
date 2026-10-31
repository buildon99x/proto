import {applySnapshot} from '../../shared/delta.mjs';
import {decodeState} from './logic.js';
// One instance per browser connection; pending room changes do not reset membership.
export class SnapshotTransport {
 constructor(clock=Date.now){this.clock=clock;this.reset();}
 reset(room=null){this.room=room;this.baseline=null;this.waitingFull=false;this.requested=false;this.lastResync=-Infinity;}
 resync(){const now=this.clock(),send=!this.requested&&now-this.lastResync>=1000;if(send){this.requested=true;this.lastResync=now;}return{state:null,resync:send};}
 receive(packet){const ignored={state:null,resync:false};if(!packet||packet.type!=='state'||!this.room||packet.room!==this.room)return ignored;const full=packet.schema==='packed-v1'||(packet.schema==='delta-v1'&&packet.kind==='full');if(this.baseline&&packet.seq<this.baseline.seq)return ignored;if(this.waitingFull&&!full)return this.resync();
 try{const result=applySnapshot(this.baseline,packet);if(full){this.waitingFull=false;this.requested=false;}if(result.status!=='applied')return ignored;const replace=full&&this.baseline!==null&&result.state.seq===this.baseline.seq;this.baseline=result.state;return{state:decodeState(structuredClone(result.state)),resync:false,replace};}catch(error){if(!['SNAPSHOT_GAP','INVALID_SNAPSHOT'].includes(error.code))return ignored;this.waitingFull=true;return this.resync();}}
}
