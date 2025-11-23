import type { Browser, Page } from "../types.ts";

import { chromium } from "playwright-extra";

export async function createBrowser(): Promise<Browser> {
	return await chromium.launch({
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
		headless: false,
	});
}

export async function typeLikeAHuman(page: Page, selector: string, text: string) {
	const element = page.locator(selector);
	await element.waitFor({ state: "visible" });
	await element.pressSequentially(text, {
		delay: Math.floor(Math.random() * 100) + 50,
	});
}
