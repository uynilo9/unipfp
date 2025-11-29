import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, Platform, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <Platform> {
	name: "Twitch",
	homeUrl: "https://www.twitch.tv/",
	loginUrl: "https://www.twitch.tv/login",
	settingsUrl: "https://www.twitch.tv/settings/profile",
	cookiesPath: "cookies/twitch.json",

	credentials: {
		username: Deno.env.get("TWITCH_USERNAME"),
		password: Deno.env.get("TWITCH_PASSWORD"),
		secret: Deno.env.get("TWITCH_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		await page.goto(this.settingsUrl);
		await page.locator('div[data-a-target="passport-modal"], body.logged-in').waitFor();

		return Ok(await page.locator("body.logged-in").isVisible());
	},

	async performLogin(page: Page) {
		// await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (username && password) {
			await page.locator("#login-username").waitFor();
			await typeLikeAHuman(page, "#login-username", username);
			await typeLikeAHuman(page, "#password-input", password);

			await page.click('button[data-a-target="passport-login-button"]');
			await page.locator('div[data-a-target="passport-modal"] div[role="alert"], div[data-a-target="profile-image"], #authenticator-token-input').waitFor();

			if (await page.locator('div[data-a-target="passport-modal"] div[role="alert"]').isVisible()) {
				return Err(new Error("Wrong Twitch username or password. Please check out your environment file."));
			} else if (await page.locator('div[data-a-target="profile-image"]').isVisible()) {
				return Ok(null);
			} else if (await page.locator("#authenticator-token-input").isVisible()) {
				return await this.performVerify(page);
			}

			return Err(new Error("Unexpected error occurred."));
		}

		return Err(new Error("Could not find the Twitch username or password. Please check out your environment file."));
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("#authenticator-token-input").isVisible()) {
			return Err(new Error("Expected to find the TOTP input, but it was not found."));
		}

		const secret = this.credentials.secret;
		if (secret) {
			const token = generateTotp(secret);
			if (token.type === "err") {
				return Err(token.error);
			}
			await typeLikeAHuman(page, "#authenticator-token-input", token.value);

			await page.click('input[name="rememberMe"]+label');
			await page.waitForTimeout(500);
			await page.click('button[type="submit"]');
			await page.locator('div[data-a-target="passport-modal"] div[role="alert"], div[data-a-target="profile-image"]').waitFor();

			if (await page.locator('div[data-a-target="passport-modal"] div[role="alert"]').isVisible()) {
				return Err(new Error("Wrong Twitch TOTP. Please check out your Twitch 2FA secret in your environment file."));
			} else if (await page.locator('div[data-a-target="profile-image"]').isVisible()) {
				return Ok(null);
			}

			return Err(new Error("Unexpected error occurred."));
		}

		return Err(new Error("Could not find the Twitch 2FA secret. Please check out in your environment file."));
	},

	async performUpdate(page: Page, img: string): Promise<Result> {
		await page.goto(this.settingsUrl);

		const editButton = page.locator('button[data-a-target="profile-image-upload-button"]');
		await editButton.waitFor();

		const fileChooser = page.waitForEvent("filechooser");

		await editButton.click();

		const uploadButton = page.locator('button[data-a-target="upload-photo-input"]');
		await page.locator("div.update-profile-picture-modal").waitFor();
		await uploadButton.click();

		await (await fileChooser).setFiles(img);
		await page.locator("canvas").waitFor();

		const setButton = page.locator('div.profile-edit div[data-a-target="tw-core-button-label-text"]').last();
		await setButton.waitFor();
		await setButton.click();

		try {
			await page.locator('div.profile-image-setting div[role="alert"]').waitFor();

			return Ok(null);
		} catch {
			return Err(new Error("Unexpected error occurred."));
		}
	},
};
