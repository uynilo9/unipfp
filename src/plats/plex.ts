import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
	name: "Plex",
	homeUrl: "https://app.plex.tv/desktop/#!/",
	loginUrl: "https://app.plex.tv/desktop/#!/login",
	settingsUrl: "https://x.com/settings/profile",
	cookiesPath: "cookies/plex.json",

	credentials: {
		username: Deno.env.get("PLEX_USERNAME"),
		password: Deno.env.get("PLEX_PASSWORD"),
		secret: Deno.env.get("PLEX_SECRET"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		const username = this.credentials.username;
		if (!username) {
			return Err("Could not find the Plex username. Please check out your environment file.");
		}

		await page.goto(this.loginUrl);
		await page.locator(`#iFrameResizer0, a[href*=\"${username}\"], ul.user-select-list`).waitFor();

		if (await page.locator("ul.user-select-list").isVisible()) {
			for (const user of await page.locator("div.username, div.managed-title").all()) {
				if (await user.innerText() === username) {
					await user.click();
					return Ok(true);
				}
			}

			return Err("Could not find the username while trying to select user in Plex. Please check out your environment file.");
		}

		return Ok(await page.locator("#iFrameResizer0").isHidden());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		const frame = page.frameLocator("#iFrameResizer0");
		await frame.locator("button[data-testid=signIn--email]").click();

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err("Could not find the Plex username or password. Please check out your environment file.");
		}

		await typeLikeAHuman(frame, "#email", username);
		await typeLikeAHuman(frame, "#password", password);

		await frame.locator("button[data-testid=signIn--submit]").click();
		await frame.locator('span[style*="color: rgb(240, 100, 100);"], button[data-testid=navbarAccountMenuTrigger], #verificationCode').waitFor();

		if (await frame.locator('span[style*="color: rgb(240, 100, 100);"]').isVisible()) {
			return Err("Wrong Plex username or password. Please check out your environment file.");
		} else if (await frame.locator("button[data-testid=navbarAccountMenuTrigger]").isVisible()) {
			return Ok();
		} else if (await frame.locator("#verificationCode").isVisible()) {
			return await this.performVerify(page);
		}

		return Err("Unexpected error occurred while trying to log into Plex.");
	},

	async performVerify(page: Page): Promise<Result> {
		const frame = page.frameLocator("#iFrameResizer0");

		if (!await frame.locator("#verificationCode").isVisible()) {
			return Err("Expected to find the TOTP input, but it was not found while trying to verify in Plex.");
		}

		const secret = this.credentials.secret;
		if (!secret) {
			return Err("Could not find the Plex 2FA secret. Please check out your environment file.");
		}

		const token = generateTotp(secret);
		if (token.isErr()) {
			return Err(token.error);
		}
		await typeLikeAHuman(frame, "#verificationCode", token.value);

		await frame.locator("button[type=submit]").click();
		await Promise.race([
			frame.locator('span[style*="color: rgb(240, 100, 100);"]').waitFor(),
			page.locator("button[data-testid=navbarAccountMenuTrigger]").waitFor(),
		]).catch(() => {});

		if (await frame.locator('span[style*="color: rgb(240, 100, 100);"]').isVisible()) {
			return Err("Wrong Plex TOTP. Please check out your Plex 2FA secret in your environment file.");
		} else if (await page.locator("button[data-testid=navbarAccountMenuTrigger]").isVisible()) {
			return Ok();
		}

		return Err("Unexpected error occurred while trying to verify in Plex.");
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		// await page.goto(this.settingsUrl);

		const warningIgnoreButton = page.locator("button[data-dismiss=modal]").first();
		if (await warningIgnoreButton.isVisible()) {
			await warningIgnoreButton.click();
		}

		await page.click("button[data-testid=navbarAccountMenuTrigger]");

		const settingsButton = page.locator('a[href*="settings/account"]');
		await settingsButton.waitFor();
		await settingsButton.click();

		const editButton = page.locator("div[class*=AvatarImg]");
		await editButton.waitFor();
		await editButton.click();

		const imageInput = page.locator("input[type=file]");
		await imageInput.setInputFiles(image);

		const saveButton = page.locator("button[type=submit]");
		await saveButton.waitFor();
		await saveButton.click();

		try {
			await saveButton.waitFor({ state: "hidden" });

			return Ok();
		} catch {
			return Err("Unexpected error occurred while trying to update your pfp in Plex.");
		}
	},
};
