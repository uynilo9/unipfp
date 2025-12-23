import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
	name: "Threads",
	homeUrl: "https://www.threads.com/",
	loginUrl: "https://www.threads.com/login",
	settingsUrl: "",
	cookiesPath: "cookies/threads.json",

	credentials: {
		username: Deno.env.get("INSTAGRAM_USERNAME"),
		password: Deno.env.get("INSTAGRAM_PASSWORD"),
		secret: Deno.env.get("INSTAGRAM_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		const username = this.credentials.username;
		if (!username) {
			return Err("Could not find the Instagram username. Please check out your environment file.");
		}

		await page.goto(this.loginUrl);
		await page.locator(`input[type=password], a[href*="${username}"]:has(img)`).waitFor();

		return Ok(await page.locator(`a[href*="${username}"]:has(img)`).isVisible());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		await page.click("form div[role=button]:has(i)");

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err("Could not find the Instagram username or password. Please check out your environment file.");
		}

		await page.locator("input[name=username]").waitFor();
		await typeLikeAHuman(page, "input[name=username]", username);
		await typeLikeAHuman(page, "input[name=password]", password);

		await page.click("button[type=submit]");
		await page.locator(`#loginForm span[dir=auto], a[href*="${username}"]:has(img), input[name=verificationCode]`).waitFor();

		if (await page.locator("#loginForm span[dir=auto]").isVisible()) {
			return Err("Wrong Instagram username or password. Please check out your environment file.");
		} else if (await page.locator(`a[href*="${username}"]:has(img)`).isVisible()) {
			return Ok();
		} else if (await page.locator("input[name=verificationCode]").isVisible()) {
			return await this.performVerify(page);
		}

		return Err("Unexpected error occurred while trying to log into Threads.");
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("input[name=verificationCode]").isVisible()) {
			return Err("Expected to find the TOTP input, but it was not found while trying to verify in Instagram.");
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err("Could not find the Instagram 2FA secret. Please check out in your environment file.");
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(page, "input[name=verificationCode]", token.value);

		const username = this.credentials.username;

		await page.click("form button[type=button]:not(:has(div))");
		await page.locator(`#twoFactorErrorAlert, a[href*="${username}"]:has(img)`).waitFor();

		if (await page.locator("#twoFactorErrorAlert").isVisible()) {
			return Err("Wrong Instagram TOTP. Please check out your Instagram 2FA secret in your environment file.");
		} else if (await page.locator(`a[href*="${username}"]:has(img)`).isVisible()) {
			return Ok();
		}

		return Err("Unexpected error occurred while trying to verify in Instagram.");
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		const username = this.credentials.username;

		await page.goto(`${this.homeUrl}/@${username}`);

		const editButton = page.locator("div[role=region] div[role=button]").nth(2);
		await editButton.waitFor();
		await editButton.click();

		const imageInput = page.locator("input[type=file]").first();
		await imageInput.setInputFiles(image);

		const doneButton = page.locator("div[role=dialog] div[role=button]").last();
		await doneButton.waitFor();
		await doneButton.click();

		try {
			await doneButton.waitFor({ state: "hidden" });

			return Ok();
		} catch {
			return Err("Unexpected error occurred while trying to update your pfp in Threads.");
		}
	},
};
