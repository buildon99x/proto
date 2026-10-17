import {run as base} from './court-framing.mjs';
import {observeAim} from './observe-aim.mjs';
export {meta} from './court-framing.mjs';
export async function run(ctx){await observeAim(ctx,base);}
