import * as fs from "@std/fs";

import { Err, Ok } from "./types.ts";
import type { Browser, BrowserContext, PlatformViaBrowser, Result } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";
import GitHub from "./plats/github.ts";
import Twitch from "./plats/twitch.ts";

const img = "";

async function updatePfpViaBrowser(browser: Browser, platform: PlatformViaBrowser): Promise<Result> {
	let context: BrowserContext;

	if (await fs.exists(platform.cookiesPath)) {
		context = await browser.newContext({ storageState: platform.cookiesPath });
	} else {
		context = await browser.newContext();
	}

	const page = await context.newPage();

	const accountLoggedIn = await platform.checkStatus(page);
	if (accountLoggedIn.isErr()) {
		return Err(accountLoggedIn.error);
	}

	if (accountLoggedIn.isOk() && !accountLoggedIn.value) {
		const loggingIn = await platform.performLogin(page);
		if (loggingIn.isErr()) {
			return Err(loggingIn.error);
		}
	}

	await context.storageState({ path: platform.cookiesPath });

	const pfpUpdated = await platform.performUpdate(page, img);
	if (pfpUpdated.isErr()) {
		return Err(pfpUpdated.error);
	}

	await page.close();
	await context.close();
	return Ok(null);
}

async function main() {
	await fs.ensureDir("cookies");

	const browser = await createBrowser();
	if (browser.isErr()) {
		throw browser.error;
	}

	const github = await updatePfpViaBrowser(browser.value, GitHub);
	if (github.isErr()) {
		throw github.error;
	}

	const twitch = await updatePfpViaBrowser(browser.value, Twitch);
	if (twitch.isErr()) {
		throw twitch.error;
	}

	await browser.value.close();
}

await main();
