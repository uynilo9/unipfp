import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
	name: "Instagram",
	homeUrl: "https://www.instagram.com/",
	loginUrl: "https://www.instagram.com/accounts/login",
	settingsUrl: "https://www.instagram.com/accounts/edit",
	cookiesPath: "cookies/instagram.json",

	credentials: {
		username: Deno.env.get("INSTAGRAM_USERNAME"),
		password: Deno.env.get("INSTAGRAM_PASSWORD"),
		secret: Deno.env.get("INSTAGRAM_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		page.goto(this.settingsUrl);
		await page.locator("button[type=submit], span button img").waitFor();

		return Ok(await page.locator("span button img").isVisible());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err(new Error("Could not find the Instagram username or password. Please check out your environment file."));
		}

		await typeLikeAHuman(page, "input[name=username]", username);
		await typeLikeAHuman(page, "input[name=password]", password);

		await page.click("button[type=submit]");
		await page.locator(`#loginForm span[dir=auto], a[href*="${username}"], input[name=verificationCode]`).waitFor();

		if (await page.locator("#loginForm span[dir=auto]").isVisible()) {
			return Err(new Error("Wrong Instagram username or password. Please check out your environment file."));
		} else if (await page.locator(`a[href*="${username}"]`).isVisible()) {
			return Ok();
		} else if (await page.locator("input[name=verificationCode]").isVisible()) {
			return await this.performVerify(page);
		}

		return Err(new Error("Unexpected error occurred while trying to log into Instagram."));
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("input[name=verificationCode]").isVisible()) {
			return Err(new Error("Expected to find the TOTP input, but it was not found while trying to verify in Instagram."));
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err(new Error("Could not find the Instagram 2FA secret. Please check out in your environment file."));
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(page, "input[name=verificationCode]", token.value);

		const username = this.credentials.username;

		await page.click("form button[type=button]:not(:has(div))");
		await page.locator(`#twoFactorErrorAlert, a[href*="${username}"]`).waitFor();

		if (await page.locator("#twoFactorErrorAlert").isVisible()) {
			return Err(new Error("Wrong Instagram TOTP. Please check out your Instagram 2FA secret in your environment file."));
		} else if (await page.locator(`a[href*="${username}"]`).isVisible()) {
			return Ok();
		}

		return Err(new Error("Unexpected error occurred while trying to verify in Instagram."));
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		await page.goto(this.settingsUrl);

		const imageInput = page.locator("input[type=file]").first();
		await imageInput.setInputFiles(image);

		try {
			await page.locator("div[role=alert]").waitFor();

			return Ok();
		} catch {
			return Err(new Error("Unexpected error occurred while trying to update your pfp in Instagram."));
		}
	},
};
