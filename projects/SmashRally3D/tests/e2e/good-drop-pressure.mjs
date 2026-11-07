export { meta } from "./drop-defence.mjs";
import { run as base } from "./drop-defence.mjs";
export async function run(ctx) {
  return base({
    ...ctx,
    difficulties: ["NORMAL"],
    patterns: ["wide-soft", "clear-soft"],
    reactionMs: 170,
    settledLimit: 10,
  });
}
