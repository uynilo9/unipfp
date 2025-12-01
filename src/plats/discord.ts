import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
	name: "Discord",
	homeUrl: "https://discord.com/channel/@me",
	loginUrl: "https://discord.com/login",
	settingsUrl: "",
	cookiesPath: "",

	credentials: {
		email: Deno.env.get("DISCORD_EMAIL"),
		password: Deno.env.get("DISCORD_PASSWORD"),
		secret: Deno.env.get("DISCORD_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		await page.goto(this.loginUrl);
		await page.locator("input[name=email], nav[class*=guilds]").waitFor();

		return Ok(await page.locator("nav[class*=guilds]").isVisible());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		const email = this.credentials.email;
		const password = this.credentials.password;
		if (!email || !password) {
			return Err(new Error("Could not find the Discord email or password. Please check out your environment file."));
		}

		await typeLikeAHuman(page, "input[name=email]", email);
		await typeLikeAHuman(page, "input[name=password]", password);

		await page.click("button[type=submit]");
		await page.locator("div[class*=helperTextContainer], nav[class*=guilds], input[autocomplete=one-time-code]").first().waitFor();

		if (await page.locator("div[class*=helperTextContainer]").first().isVisible()) {
			switch (await page.locator("div[class*=helperTextContainer]").count()) {
				case 1: {
					return Err(new Error("New Discord account login location detected. Please check out your email inbox."));
				}
				case 2: {
					return Err(new Error("Wrong Discord email or password. Please check out your environment file."));
				}
				default: {
					return Err(new Error("Unexpected error occurred while trying to log into Discord."));
				}
			}
		} else if (await page.locator("nav[class*=guilds]").isVisible()) {
			return Ok();
		} else if (await page.locator("input[autocomplete=one-time-code]").isVisible()) {
			return await this.performVerify(page);
		}

		return Err(new Error("Unexpected error occurred while trying to log into Discord."));
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("input[autocomplete=one-time-code]").isVisible()) {
			return Err(new Error("Expected to find the TOTP input, but it was not found while trying to verify in Discord."));
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err(new Error("Could not find the Discord 2FA secret. Please check out your environment file."));
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(page, "input[autocomplete=one-time-code]", token.value);

		await page.click("button[type=submit]");
		await page.locator("div[class*=error], nav[class*=guilds]").waitFor();

		if (await page.locator("div[class*=error]").isVisible()) {
			return Err(new Error("Wrong Discord TOTP. Please check out your Discord 2FA secret in your environment file."));
		} else if (await page.locator("nav[class*=guilds]").isVisible()) {
			return Ok();
		}

		return Err(new Error("Unexpected error occurred while trying to verify in Discord."));
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		await page.locator("section button").last().click();
		await page.locator("div[role=dialog] div[role=tablist]").waitFor();
		await page.locator("div[role=dialog] div[role=tablist]+div button").first().click();

		const changeButton = page.locator("div[role=dialog] h1+div button").first();
		await changeButton.waitFor();

		const fileChooser = page.waitForEvent("filechooser");

		await changeButton.click();

		const uploadButton = page.locator("input.file-input");
		await uploadButton.waitFor();
		await uploadButton.click();

		await (await fileChooser).setFiles(image);
		await page.locator("img[alt=avatar]").waitFor();

		const applyButton = page.locator("footer button").last();
		await applyButton.waitFor();
		await applyButton.click();

		const saveButton = page.locator("div[class*=notice] button").last();
		await saveButton.waitFor();
		await saveButton.click();

		try {
			await saveButton.waitFor({ state: "hidden" });

			return Ok();
		} catch {
			return Err(new Error("Unexpected error occurred while trying to update your pfp in Discord."));
		}
	},
};
