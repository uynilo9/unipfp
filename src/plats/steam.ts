import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";

export default <PlatformViaBrowser> {
	name: "Steam",
	homeUrl: "https://store.steampowered.com/",
	loginUrl: "https://store.steampowered.com/login",
	settingsUrl: "https://steamcommunity.com/my/edit/avatar",
	cookiesPath: "cookies/steam.json",

	credentials: {
		username: Deno.env.get("STEAM_USERNAME"),
		password: Deno.env.get("STEAM_PASSWORD"),
	},

	async checkStatus(page: Page): Promise<Result<boolean>> {
		const username = this.credentials.username;
		if (!username) {
			return Err("Could not find the Steam username. Please check out your environment file.");
		}

		await page.goto(this.settingsUrl);
		await page.locator(`input[type=password], #global_actions img[alt="${username}"]`).waitFor();

		return Ok(await page.locator("input[type=password]").isHidden());
	},

	async performLogin(page: Page): Promise<Result> {
		// await page.goto(this.loginUrl);

		const username = this.credentials.username;
		const password = this.credentials.password;
		if (!username || !password) {
			return Err("Could not find the Steam username or password. Please check out your environment file.");
		}

		await typeLikeAHuman(page, "div[data-featuretarget=login] input[type=text]", username);
		await typeLikeAHuman(page, "input[type=password]", password);

		await page.click("button[type=submit]");
		await page.locator('div:has(+ a[href*="HelpWithLogin?"]) >> text=/\\S/').or(page.locator(`#global_actions img[alt="${username}"], img[src*="login_mobile_auth.png"], input[maxlength="1"][data-sharkid="__0"]`)).waitFor();

		if (await page.locator(`div:has(+ a[href*="HelpWithLogin?"]) >> text=/\\S/`).isVisible()) {
			return Err("Wrong Steam username or password. Please check out your environment file.");
		} else if (await page.locator(`#global_actions img[alt="${username}"]`).isVisible()) {
			return Ok();
		} else if (await page.locator('img[src*="login_mobile_auth.png"]').isVisible() || await page.locator('input[maxlength="1"][data-sharkid="__0"]').isVisible()) {
			return await this.performVerify(page);
		}

		return Err("Unexpected error occurred while trying to log into Steam.");
	},

	async performVerify(page: Page): Promise<Result> {
		try {
			await page.locator(`#global_actions img[alt="${this.credentials.username}"]`).waitFor({ timeout: 30000 });

			return Ok();
		} catch {
			return Err("Something went wrong while waiting for the user to verify the login in Steam.");
		}
	},

	async performUpdate(page: Page, image: string): Promise<Result> {
		// await page.goto(this.settingsUrl);

		const imageInput = page.locator("input[type=file]");
		await imageInput.setInputFiles(image);

		const setButton = page.locator("#profile_edit_leftcol button").nth(1);
		await page.locator("div.cropper-container").waitFor();
		await setButton.click();

		try {
			await page.locator("div.cropper-container").waitFor({ state: "hidden" });

			return Ok();
		} catch {
			return Err("Unexpected error occurred while trying to update your pfp in Steam.");
		}
	},
};
