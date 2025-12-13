import * as fs from "@std/fs";

import { getImageType } from "./utils/image.ts";
import { createBrowser } from "./utils/browser.ts";
import { updatePfpViaApi, updatePfpViaBrowser } from "./utils/update.ts";

import * as clack from "@clack/prompts";

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

async function main() {
	clack.intro("Unipfp");

	const image = await clack.text({
		message: "Where's your pfp located?",
		placeholder: "./pfp.jpg",
		validate: (value) => {
			if (!value) {
				return "Please enter a path.";
			}

			const type = getImageType(value);
			if (type.isErr()) {
				return type.error.message;
			}

			if (!fs.existsSync(value)) {
				return "Please enter a valid image file path.";
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
	if (clack.isCancel(platforms)) {
		clack.cancel("Operation cancelled.");
		Deno.exit(1);
	}

	if (platforms.includes("discord")) {
		clack.log.warn("You may have to manually bypass Discord reCAPTCHA, as it sometimes shows up.");
	}
	if (platforms.includes("reddit")) {
		clack.log.warn("You have to click the Reddit logo in the top left corner to bypass Reddit reCAPTCHA while status check.");
	}
	if (platforms.includes("steam")) {
		clack.log.warn("You may have to manually comfirm your login on your Steam mobile app.");
	}
	if (platforms.includes("threads")) {
		clack.log.warn("You must fill in your Instagram username and password since you've selected Threads.");
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
		Deno.exit(1);
	}

	await clack.tasks([
		{
			enabled: platforms.includes("discord"),
			title: "Starting to update your Discord pfp",
			task: async () => {
				const discord = await updatePfpViaBrowser(browser.value, Discord, image);
				if (discord.isErr()) {
					return discord.error.message;
				}

				return discord.value;
			},
		},
		{
			enabled: platforms.includes("github"),
			title: "Starting to update your GitHub pfp",
			task: async () => {
				const github = await updatePfpViaBrowser(browser.value, GitHub, image);
				if (github.isErr()) {
					return github.error.message;
				}

				return github.value;
			},
		},
		{
			enabled: platforms.includes("gitlab"),
			title: "Starting to update your GitLab pfp",
			task: async () => {
				const gitlab = await updatePfpViaApi(GitLab, image);
				if (gitlab.isErr()) {
					return gitlab.error.message;
				}

				return gitlab.value;
			},
		},
		{
			enabled: platforms.includes("instagram"),
			title: "Starting to update your Instagram pfp",
			task: async () => {
				const instagram = await updatePfpViaBrowser(browser.value, Instagram, image);
				if (instagram.isErr()) {
					return instagram.error.message;
				}

				return instagram.value;
			},
		},
		{
			enabled: platforms.includes("plex"),
			title: "Starting to update your Plex pfp",
			task: async () => {
				const plex = await updatePfpViaBrowser(browser.value, Plex, image);
				if (plex.isErr()) {
					return plex.error.message;
				}

				return plex.value;
			},
		},
		{
			enabled: platforms.includes("reddit"),
			title: "Starting to update your Reddit pfp",
			task: async () => {
				const reddit = await updatePfpViaBrowser(browser.value, Reddit, image);
				if (reddit.isErr()) {
					return reddit.error.message;
				}

				return reddit.value;
			},
		},
		{
			enabled: platforms.includes("steam"),
			title: "Starting to update your Steam pfp",
			task: async () => {
				const steam = await updatePfpViaBrowser(browser.value, Steam, image);
				if (steam.isErr()) {
					return steam.error.message;
				}

				return steam.value;
			},
		},
		{
			enabled: platforms.includes("threads"),
			title: "Starting to update your Threads pfp",
			task: async () => {
				const threads = await updatePfpViaBrowser(browser.value, Threads, image);
				if (threads.isErr()) {
					return threads.error.message;
				}

				return threads.value;
			},
		},
		{
			enabled: platforms.includes("twitch"),
			title: "Starting to update your Twitch pfp",
			task: async () => {
				const twitch = await updatePfpViaBrowser(browser.value, Twitch, image);
				if (twitch.isErr()) {
					return twitch.error.message;
				}

				return twitch.value;
			},
		},
		{
			enabled: platforms.includes("twitterx"),
			title: "Starting to update your Twitter(X) pfp",
			task: async () => {
				const twitterx = await updatePfpViaBrowser(browser.value, TwitterX, image);
				if (twitterx.isErr()) {
					return twitterx.error.message;
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
