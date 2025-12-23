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
		return Err(`Cound not create a Chromium browser for some reason. See the error Playwright threw below:\n\n${err}`);
	}
}

export async function typeLikeAHuman(view: FrameLocator | Page, selector: string, text: string) {
	try {
		const element = view.locator(selector);
		await element.waitFor();
		await element.pressSequentially(text, { delay: Math.floor(Math.random() * 100) + 50 });
	} catch (err) {
		throw (`Could not type for some reason. See the error Playwright threw below:\n\n${err}`);
	}
}
