import "@std/dotenv/load";

import type { Page, Platform } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generate2FAToken } from "../utils/totp.ts";

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

	async checkStatus(page: Page) {
		await page.goto(this.settingsUrl);

		await page.waitForTimeout(2000);

		return await page.locator('div[data-a-target="passport-modal"]').isHidden();
	},

	async performLogin(page: Page) {
		// await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (username && password) {
			await typeLikeAHuman(page, "#login-username", username);
			await typeLikeAHuman(page, "#password-input", password);

			await page.click('button[data-a-target="passport-login-button"]');
			await page.waitForTimeout(2000);
		}
	},

	async performVerify(page: Page) {
		const totpInput = page.locator("#authenticator-token-input");
		if (!await totpInput.first().isVisible()) {
			return;
		}

		const secret = this.credentials.secret;
		if (secret) {
			const token = generate2FAToken(secret);
			await typeLikeAHuman(page, "#authenticator-token-input", token);

			await page.click('label:has-text("Remember this device for 30 days")');
			await page.click('button[type="submit"]');

			await page.waitForTimeout(2000);
		}

		await page.goto(this.homeUrl);
	},

	async performUpdate(page: Page, img: string) {
		await page.goto(this.settingsUrl);

		const fileChooser = page.waitForEvent("filechooser");

		await page.click('button[data-a-target="profile-image-upload-button"]');

		await page.waitForTimeout(2000);

		await page.click('button[data-a-target="upload-photo-input"]');

		await (await fileChooser).setFiles(img);

		await page.waitForTimeout(2000);

		const setButton = page.locator('button:has-text("Save")').last();
		await setButton.waitFor();
		await setButton.click();

		await page.waitForTimeout(3000);
	},
};
