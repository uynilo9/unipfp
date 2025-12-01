import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
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

	async checkStatus(page: Page): Promise<Result<boolean>> {
		await page.goto(this.settingsUrl);
		await page.locator("body.logged-out, body.logged-in").waitFor();

		return Ok(await page.locator("body.logged-in").isVisible());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err(new Error("Could not find the GitHub username or password. Please check out your environment file."));
		}

		await typeLikeAHuman(page, "#login_field", username);
		await typeLikeAHuman(page, "#password", password);

		await page.click("input[type=submit]");
		await page.locator("#js-flash-container div.flash-error, body.logged-in, #app_totp").waitFor();

		if (await page.locator("#js-flash-container div.flash-error").isVisible()) {
			return Err(new Error("Wrong GitHub username or password. Please check out your environment file."));
		} else if (await page.locator("body.logged-in").isVisible()) {
			return Ok();
		} else if (await page.locator("#app_totp").isVisible()) {
			return await this.performVerify(page);
		}

		return Err(new Error("Unexpected error occurred."));
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("#app_totp").isVisible()) {
			return Err(new Error("Expected to find the TOTP input, but it was not found."));
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err(new Error("Could not find the GitHub 2FA secret. Please check out your environment file."));
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(page, "#app_totp", token.value);

		await page.locator("#js-flash-container div.flash-error, body.logged-in").waitFor();

		if (await page.locator("#js-flash-container div.flash-error").isVisible()) {
			return Err(new Error("Wrong GitHub TOTP. Please check out your GitHub 2FA secret in your environment file."));
		} else if (await page.locator("body.logged-in").isVisible()) {
			return Ok();
		}

		return Err(new Error("Unexpected error occurred."));
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		await page.goto(this.settingsUrl);

		const imageInput = page.locator("input[type=file]#avatar_upload");
		await imageInput.setInputFiles(image);

		const setButton = page.locator("#avatar-crop-form button[type=submit]");
		await setButton.waitFor();
		await setButton.click();

		try {
			await page.locator("#js-flash-container div.flash-notice").waitFor();

			return Ok();
		} catch {
			return Err(new Error("Unexpected error occurred."));
		}
	},
};
