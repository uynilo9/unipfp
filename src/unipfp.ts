import * as fs from "@std/fs";

import { getImageType } from "./utils/image.ts";
import { createBrowser } from "./utils/browser.ts";
import { prepareUpdaterViaApi, prepareUpdaterViaBrowser } from "./utils/update.ts";

import { cancel, confirm, intro, isCancel, log, multiselect, outro, spinner, text } from "@clack/prompts";

import Discord from "./plats/discord.ts";
import GitHub from "./plats/github.ts";
import GitLab from "./plats/gitlab.ts";
import Instagram from "./plats/instagram.ts";
import Plex from "./plats/plex.ts";
import Reddit from "./plats/reddit.ts";
import Steam from "./plats/steam.ts";
import Threads from "./plats/threads.ts";
import Twitch from "./plats/twitch.ts";
import TwitterX from "./plats/twitterx.ts";

intro("Unipfp");

const image = await text({
	message: "Where is your new pfp located?",
	validate: (value) => {
		if (!value) {
			return "Please enter a path.";
		}

		const type = getImageType(value);
		if (type.isErr()) {
			return type.error;
		}

		if (!fs.existsSync(value)) {
			return "Please enter a valid image file path.";
		}
	},
});
if (isCancel(image)) {
	cancel("Mission cancelled.");
	Deno.exit(0);
}

const platforms = await multiselect({
	message: "Which platforms do you want to update your pfp?",
	options: [
		{ value: "discord", label: "Discord", hint: "via browser" },
		{ value: "github", label: "GitHub", hint: "via browser" },
		{ value: "gitlab", label: "GitLab", hint: "via API" },
		{ value: "instagram", label: "Instagram", hint: "via browser" },
		{ value: "plex", label: "Plex", hint: "via browser" },
		{ value: "reddit", label: "Reddit", hint: "via browser" },
		{ value: "steam", label: "Steam", hint: "via browser" },
		{ value: "threads", label: "Threads", hint: "via browser" },
		{ value: "twitch", label: "Twitch", hint: "via browser" },
		{ value: "twitterx", label: "Twitter(X)", hint: "via browser" },
	],
	required: true,
});
if (isCancel(platforms)) {
	cancel("Mission cancelled.");
	Deno.exit(0);
}

const warning = {
	discord: "You may have to manually bypass Discord reCAPTCHA, as it sometimes shows up.",
	reddit: "You have to click the Reddit logo in the top left corner to bypass Reddit reCAPTCHA while status check.",
	steam: "You may have to manually comfirm your login on your Steam mobile app.",
	threads: "You must fill in your Instagram username and password since you've selected Threads.",
};

platforms.forEach((platform) => {
	const message = warning[platform as keyof typeof warning];
	if (message) {
		log.warn(message);
	}
});

const comfirm = await confirm({
	message: "Are you sure to update your pfp?",
});
if (isCancel(comfirm) || !comfirm) {
	cancel("Mission cancelled.");
	Deno.exit(0);
}

await fs.ensureDir("cookies");

const browser = await createBrowser();
if (browser.isErr()) {
	log.error(`Something went wrong while creating a Chromium browser. See the error message below:\n\n${browser.error}`);
	Deno.exit(1);
}

const getUpdaterViaApi = prepareUpdaterViaApi(image);
const getUpdaterViaBrowser = prepareUpdaterViaBrowser(browser.value, image);
const updater = {
	discord: getUpdaterViaBrowser(Discord),
	github: getUpdaterViaBrowser(GitHub),
	gitlab: getUpdaterViaApi(GitLab),
	instagram: getUpdaterViaBrowser(Instagram),
	plex: getUpdaterViaBrowser(Plex),
	reddit: getUpdaterViaBrowser(Reddit),
	steam: getUpdaterViaBrowser(Steam),
	threads: getUpdaterViaBrowser(Threads),
	twitch: getUpdaterViaBrowser(Twitch),
	twitterx: getUpdaterViaBrowser(TwitterX),
};

for (const platform of platforms) {
	await updater[platform](spinner());
}

outro("Mission completed.");
Deno.exit(0);
