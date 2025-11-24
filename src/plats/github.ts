import "@std/dotenv/load";

import type { Page, Platform } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <Platform> {
	name: "GitHub",
	homeUrl: "https://github.com/",
	loginUrl: "https://github.com/login",
	settingsUrl: "https://github.com/settings/profile",
	cookiesPath: "cookies/github.json",

	credentials: {
		username: Deno.env.get("GITHUB_USERNAME"),
		password: Deno.env.get("GITHUB_PASSWORD"),
		secret: Deno.env.get("GITHUB_SECRET"),
	},

	async checkStatus(page: Page) {
		await page.goto(this.loginUrl);

		return await page.locator("body.logged-out").isHidden();
	},

	async performLogin(page: Page) {
		await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (username && password) {
			await typeLikeAHuman(page, "#login_field", username);
			await typeLikeAHuman(page, "#password", password);

			await page.click('input[type="submit"]');
		}
	},

	async performVerify(page: Page) {
		if (!await page.locator("#app_totp").isVisible()) {
			return;
		}

		const secret = this.credentials.secret;
		if (secret) {
			const token = generateTotp(secret);
			await typeLikeAHuman(page, "#app_totp", token);

			await page.waitForTimeout(2000);
		}
	},

	async performUpdate(page: Page, img: string) {
		await page.goto(this.settingsUrl);

		const imgInput = page.locator('input[type="file"]#avatar_upload');
		await imgInput.setInputFiles(img);

		const setButton = page.locator('button:has-text("Set new profile picture")');
		await setButton.waitFor();
		await setButton.click();

		await page.waitForTimeout(3000);
	},
};
