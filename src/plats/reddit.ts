import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
	name: "Reddit",
	homeUrl: "https://www.reddit.com/",
	loginUrl: "https://www.reddit.com/login",
	settingsUrl: "https://www.reddit.com/settings/profile",
	cookiesPath: "cookies/reddit.json",

	credentials: {
		username: Deno.env.get("REDDIT_USERNAME"),
		password: Deno.env.get("REDDIT_PASSWORD"),
		secret: Deno.env.get("REDDIT_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		await page.goto(this.homeUrl);
		await page.locator('#login-button, img[alt="User Avatar"]').waitFor();

		return Ok(await page.locator('img[alt="User Avatar"]').isVisible());
	},

	async performLogin(page: Page): Promise<Result> {
		await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err(new Error("Could not find the Reddit username or password. Please check out your environment file."));
		}

		await typeLikeAHuman(page, "input[name=username]", username);
		await typeLikeAHuman(page, "input[type=password]", password);

		await page.locator("faceplate-tracker[noun=login] button").first().click();
		await Promise.race([
			page.locator("#login-password svg[icon-name=error-outline]").waitFor(),
			page.locator('img[alt="User Avatar"]').waitFor(),
			page.locator("input[name=appOtp]").waitFor(),
		]).catch(() => {});

		if (await page.locator("#login-password svg[icon-name=error-outline]").isVisible()) {
			return Err(new Error("Wrong Reddit username or password. Please check out your environment file."));
		} else if (await page.locator('img[alt="User Avatar"]').isVisible()) {
			return Ok();
		} else if (await page.locator("input[name=appOtp]").isVisible()) {
			return await this.performVerify(page);
		}

		return Err(new Error("Unexpected error occurred while trying to log into Reddit."));
	},

	async performVerify(page: Page): Promise<Result> {
		if (!await page.locator("input[name=appOtp]").isVisible()) {
			return Err(new Error("Expected to find the TOTP input, but it was not found while trying to verify in Reddit."));
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err(new Error("Could not find the Reddit 2FA secret. Please check out in your environment file."));
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(page, "input[name=appOtp]", token.value);

		const checkButton = page.locator("faceplate-tracker[noun=login] button").nth(1);
		await checkButton.waitFor();
		await checkButton.click();

		await page.locator('#one-time-code-appOtp svg[icon-name=error-outline], img[alt="User Avatar"]').waitFor();

		if (await page.locator("#one-time-code-appOtp svg[icon-name=error-outline]").isVisible()) {
			return Err(new Error("Wrong Reddit TOTP. Please check out your Reddit 2FA secret in your environment file."));
		} else if (await page.locator('img[alt="User Avatar"]').isVisible()) {
			return Ok();
		}

		return Err(new Error("Unexpected error occurred while trying to verify in Reddit."));
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		await page.goto(this.settingsUrl);

		const waitForUpdateResponse = page.waitForResponse(async (response) => {
			if (!response.url().includes("graphql") || response.status() !== 200) {
				return false;
			}

			try {
				const body = await response.json();

				return body.operation === "UpdateProfileStyles" && body.data.updateProfileStyles.ok;
			} catch {
				return false;
			}
		});

		await page.locator("div[data-testid=avatar]").click();
		await page.locator("#avatar-dialog").waitFor();

		const imageInput = page.locator("settings-dropzone input[type=file]");
		await imageInput.setInputFiles(image);

		const saveButton = page.locator("#avatar-dialog button").first();
		await saveButton.waitFor();
		await saveButton.click();

		try {
			await waitForUpdateResponse;

			return Ok();
		} catch {
			return Err(new Error("Unexpected error occurred while trying to update your pfp in Reddit."));
		}
	},
};
