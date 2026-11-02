import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
export async function openBrowser() {
  const executablePath = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
  try { return await chromium.launch({ executablePath, headless: true, chromiumSandbox: true, ignoreDefaultArgs: ['--enable-unsafe-swiftshader'] }); }
  catch (cause) { throw new Error('Chrome/Chromium unavailable. Set CHROME_PATH or run npx playwright install chromium in this skill folder.', { cause }); }
}
