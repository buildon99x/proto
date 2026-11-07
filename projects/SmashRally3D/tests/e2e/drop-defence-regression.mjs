export { meta } from "./tactical-mechanics.mjs";
import { run as base } from "./tactical-mechanics.mjs";
export async function run(ctx) {
  return base({ ...ctx, difficulties: ["NORMAL"], maxRallyReturns: 16 });
}
