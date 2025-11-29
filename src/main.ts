import * as fs from "@std/fs";

import { Err, Ok } from "./types.ts";
import type { Browser, BrowserContext, Platform, Result } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";
import GitHub from "./plats/github.ts";
import Twitch from "./plats/twitch.ts";

const img = "";

async function updatePfpViaBrowser(browser: Browser, platform: Platform): Promise<Result> {
	let context: BrowserContext;

	if (await fs.exists(platform.cookiesPath)) {
		context = await browser.newContext({ storageState: platform.cookiesPath });
	} else {
		context = await browser.newContext();
	}

	const page = await context.newPage();

	const accountLoggedIn = await platform.checkStatus(page);
	if (accountLoggedIn.type === "err") {
		return Err(accountLoggedIn.error);
	}

	if (accountLoggedIn.type === "ok" && !accountLoggedIn.value) {
		const logginIn = await platform.performLogin(page);
		if (logginIn.type === "err") {
			return Err(logginIn.error);
		}
	}

	await context.storageState({ path: platform.cookiesPath });

	const updated = await platform.performUpdate(page, img);
	if (updated.type === "err") {
		return Err(updated.error);
	}

	await page.close();
	await context.close();
	return Ok(null);
}

async function main() {
	await fs.ensureDir("cookies");

	const browser = await createBrowser();
	if (browser.type === "err") {
		throw browser.error;
	}

	const github = await updatePfpViaBrowser(browser.value, GitHub);
	if (github.type === "err") {
		throw github.error;
	}

	const twitch = await updatePfpViaBrowser(browser.value, Twitch);
	if (twitch.type === "err") {
		throw twitch.error;
	}

	await browser.value.close();
}

await main();
