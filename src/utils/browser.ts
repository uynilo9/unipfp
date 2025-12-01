import { Err, Ok } from "../types.ts";
import type { Browser, FrameLocator, Page, Result } from "../types.ts";

import { chromium } from "playwright-extra";

export async function createBrowser(): Promise<Result<Browser, unknown>> {
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
		return Err(err);
	}
}

export async function typeLikeAHuman(page: Page | FrameLocator, selector: string, text: string) {
	try {
		const element = page.locator(selector);
		await element.waitFor({ state: "visible" });
		await element.pressSequentially(text, { delay: Math.floor(Math.random() * 100) + 50 });
	} catch (err) {
		throw Err(err);
	}
}
