import * as fs from "@std/fs";

import type { Browser, BrowserContext, Platform } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";
import GitHub from "./plats/github.ts";
import Twitch from "./plats/twitch.ts";

const img = "";

async function updatePfp(browser: Browser, platform: Platform) {
	let context: BrowserContext;

	if (await fs.exists(platform.cookiesPath)) {
		context = await browser.newContext({ storageState: platform.cookiesPath });
	} else {
		context = await browser.newContext();
	}

	const page = await context.newPage();

	const loggedIn = await platform.checkStatus(page);
	if (!loggedIn) {
		await platform.performLogin(page);
		await platform.performVerify(page);

		await page.waitForURL((url) => url.href === platform.homeUrl);
		await context.storageState({ path: platform.cookiesPath });
	}

	await platform.performUpdate(page, img);

	await page.close();
	await context.close();
}

async function main() {
	await fs.ensureDir("cookies");

	const browser = await createBrowser();
	try {
		await updatePfp(browser, GitHub);
		await updatePfp(browser, Twitch);
	} catch (err) {
		throw err;
	} finally {
		await browser.close();
	}
}

await main();
