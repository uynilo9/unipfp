import * as fs from "@std/fs";

import { Err, Ok } from "../types.ts";
import type { Browser, BrowserContext, PlatformViaApi, PlatformViaBrowser, Result } from "../types.ts";

export function prepareUpdaterViaApi(image: string): (platform: PlatformViaApi) => () => Promise<Result<string>> {
	return (platform) => {
		return async () => {
			const pfpUpdated = await platform.performUpdate(image);
			if (pfpUpdated.isErr()) {
				return Err(pfpUpdated.error);
			}

			return Ok(`Successfully updated pfp on ${platform.name}.`);
		};
	};
}

export function prepareUpdaterViaBrowser(browser: Browser, image: string): (platform: PlatformViaBrowser) => () => Promise<Result<string>> {
	return (platform) => {
		return async () => {
			let context: BrowserContext;

			if (await fs.exists(platform.cookiesPath)) {
				context = await browser.newContext({ storageState: platform.cookiesPath });
			} else {
				context = await browser.newContext();
			}

			const page = await context.newPage();

			const accountLoggedIn = await platform.checkStatus(page);
			if (accountLoggedIn.isErr()) {
				await page.close();
				await context.close();
				return Err(accountLoggedIn.error);
			}

			if (accountLoggedIn.isOk() && !accountLoggedIn.value) {
				const loggingIn = await platform.performLogin(page);
				if (loggingIn.isErr()) {
					await page.close();
					await context.close();
					return Err(loggingIn.error);
				}
			}

			await context.storageState({ path: platform.cookiesPath });

			const pfpUpdated = await platform.performUpdate(page, image);
			if (pfpUpdated.isErr()) {
				await page.close();
				await context.close();
				return Err(pfpUpdated.error);
			}

			await page.close();
			await context.close();

			return Ok(`Successfully updated pfp on ${platform.name}.`);
		};
	};
}
