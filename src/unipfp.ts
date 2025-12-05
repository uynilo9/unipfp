import * as fs from "@std/fs";
import * as path from "@std/path";

import { Err, Ok } from "./types.ts";
import type { Browser, BrowserContext, PlatformViaBrowser, Result } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";

import * as clack from "@clack/prompts";

import Discord from "./plats/discord.ts";
import GitHub from "./plats/github.ts";
import Plex from "./plats/plex.ts";
import Steam from "./plats/steam.ts";
import Twitch from "./plats/twitch.ts";
import TwitterX from "./plats/twitterx.ts";

async function updatePfpViaBrowser(browser: Browser, platform: PlatformViaBrowser, image: string): Promise<Result<string>> {
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

	const pfpUpdated = await platform.performUpdate(page, image);
	if (pfpUpdated.isErr()) {
		return Err(pfpUpdated.error);
	}

	await page.close();
	await context.close();
	/**
	 * NOTE: the whitespace at the end of the Ok message is intentionally added due to a bug of Clack.
	 * See the GitHub issue: https://github.com/bombshell-dev/clack/issues/427
	 *
	 * TODO: remove it.
	 */
	return Ok(`Successfully updated pfp on ${platform.name}. `);
}

async function main() {
	clack.intro("Unipfp");

	const image = await clack.text({
		message: "Where's your pfp located?",
		placeholder: "./pfp.jpg",
		validate: (value) => {
			if (value.length === 0) {
				return "Please enter a path.";
			}

			const ext = path.extname(value).toLowerCase();
			if (![".jpg", ".jpeg", ".png", ".gif"].includes(ext)) {
				return "Please select a valid image file (.jpg, .jpeg, .png, .gif).";
			}
		},
	});
	if (clack.isCancel(image)) {
		clack.cancel("Operation cancelled.");
		Deno.exit(1);
	}

	const platforms = await clack.multiselect({
		message: "Which platforms do you want to update your pfp?",
		options: [
			{ value: "discord", label: "Discord", hint: "via browser" },
			{ value: "github", label: "GitHub", hint: "via browser" },
			{ value: "plex", label: "Plex", hint: "via browser" },
			{ value: "steam", label: "Steam", hint: "via browser" },
			{ value: "twitch", label: "Twitch", hint: "via browser" },
			{ value: "twitterx", label: "Twitter(X)", hint: "via browser" },
		],
		required: true,
	});
	if (clack.isCancel(platforms)) {
		clack.cancel("Operation cancelled.");
		Deno.exit(1);
	}

	const comfirm = await clack.confirm({
		message: "Are you sure to update your pfp?",
		active: "Yes",
		inactive: "No",
	});
	if (clack.isCancel(comfirm) || !comfirm) {
		clack.cancel("Operation cancelled.");
		Deno.exit(1);
	}

	await fs.ensureDir("cookies");

	const browser = await createBrowser();
	if (browser.isErr()) {
		clack.log.error(browser.error.message);
		clack.outro("Missions failed.");
		Deno.exit(1);
	}

	/**
	 * NOTE: the whitespace at the end of the Err messages are intentionally added due to a bug of Clack.
	 * See the GitHub issue: https://github.com/bombshell-dev/clack/issues/427
	 *
	 * TODO: remove them.
	 */
	await clack.tasks([
		{
			enabled: platforms.includes("discord"),
			title: "Starting to update your Discord pfp...",
			task: async () => {
				const discord = await updatePfpViaBrowser(browser.value, Discord, image);
				if (discord.isErr()) {
					return discord.error.message + " ";
				}

				return discord.value;
			},
		},
		{
			enabled: platforms.includes("github"),
			title: "Starting to update your GitHub pfp...",
			task: async () => {
				const github = await updatePfpViaBrowser(browser.value, GitHub, image);
				if (github.isErr()) {
					return github.error.message + " ";
				}

				return github.value;
			},
		},
		{
			enabled: platforms.includes("plex"),
			title: "Starting to update your Plex pfp...",
			task: async () => {
				const plex = await updatePfpViaBrowser(browser.value, Plex, image);
				if (plex.isErr()) {
					return plex.error.message + " ";
				}

				return plex.value;
			},
		},
		{
			enabled: platforms.includes("steam"),
			title: "Starting to update your Steam pfp...",
			task: async () => {
				const steam = await updatePfpViaBrowser(browser.value, Steam, image);
				if (steam.isErr()) {
					return steam.error.message + " ";
				}

				return steam.value;
			},
		},
		{
			enabled: platforms.includes("twitch"),
			title: "Starting to update your Twitch pfp...",
			task: async () => {
				const twitch = await updatePfpViaBrowser(browser.value, Twitch, image);
				if (twitch.isErr()) {
					return twitch.error.message + " ";
				}

				return twitch.value;
			},
		},
		{
			enabled: platforms.includes("twitterx"),
			title: "Starting to update your Twitter(X) pfp...",
			task: async () => {
				const twitterx = await updatePfpViaBrowser(browser.value, TwitterX, image);
				if (twitterx.isErr()) {
					return twitterx.error.message + " ";
				}

				return twitterx.value;
			},
		},
	]);

	await browser.value.close();

	clack.outro("Missions completed.");
	Deno.exit(0);
}

await main();
