import {run as base} from './stroke-chain.mjs';
import {observeAim} from './observe-aim.mjs';
export {meta} from './stroke-chain.mjs';
export async function run(ctx){await observeAim(ctx,base);}
