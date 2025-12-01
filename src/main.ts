import * as fs from "@std/fs";

import { Err, Ok } from "./types.ts";
import type { Browser, BrowserContext, PlatformViaBrowser, Result } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";
import Discord from "./plats/discord.ts";
import GitHub from "./plats/github.ts";
import Plex from "./plats/plex.ts";
import Twitch from "./plats/twitch.ts";
import TwitterX from "./plats/twitterx.ts";

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
	return Ok();
}

async function main() {
	await fs.ensureDir("cookies");

	const browser = await createBrowser();
	if (browser.isErr()) {
		throw browser.error;
	}

	const discord = await updatePfpViaBrowser(browser.value, Discord);
	if (discord.isErr()) {
		throw discord.error;
	}

	const github = await updatePfpViaBrowser(browser.value, GitHub);
	if (github.isErr()) {
		throw github.error;
	}

	const plex = await updatePfpViaBrowser(browser.value, Plex);
	if (plex.isErr()) {
		throw plex.error;
	}

	const twitch = await updatePfpViaBrowser(browser.value, Twitch);
	if (twitch.isErr()) {
		throw twitch.error;
	}

	const twitterx = await updatePfpViaBrowser(browser.value, TwitterX);
	if (twitterx.isErr()) {
		throw twitterx.error;
	}

	await browser.value.close();
}

await main();
