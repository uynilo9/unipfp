import { Err, Ok } from "../types.ts";
import type { Browser, FrameLocator, Page, Result } from "../types.ts";

import { chromium } from "playwright";

export async function createBrowser(): Promise<Result<Browser>> {
	try {
		return Ok(
			await chromium.launch({
				args: [
					"--no-sandbox",
					"--disable-setuid-sandbox",
					"--disable-blink-features=AutomationControlled",
				],
				headless: false,
			}),
		);
	} catch (err) {
		return Err(new Error(`Cound not create a Chromium browser for some reason. See the error Playwright threw below:\n\n${err}`));
	}
}

export async function typeLikeAHuman(page: Page | FrameLocator, selector: string, text: string) {
	try {
		const element = page.locator(selector);
		await element.waitFor({ state: "visible" });
		await element.pressSequentially(text, { delay: Math.floor(Math.random() * 100) + 50 });
	} catch (err) {
		throw new Error(`Could not type for some reason. See the error Playwright threw below:\n\n${err}`);
	}
}
