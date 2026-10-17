import {run as base} from './benchmark-native.mjs';
import {observeAim} from './observe-aim.mjs';
export {meta} from './benchmark-native.mjs';
export async function run(ctx){await observeAim(ctx,base);}
