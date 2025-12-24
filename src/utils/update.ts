import * as fs from "@std/fs";

import { Err, Ok } from "../types.ts";
import type { Browser, BrowserContext, PlatformViaApi, PlatformViaBrowser, Result, SpinnerResult } from "../types.ts";

import { log } from "@clack/prompts";

export function prepareUpdaterViaApi(image: string): (platform: PlatformViaApi) => (spinner: SpinnerResult) => Promise<Result> {
	return (platform) => {
		return async (spinner) => {
			spinner.start(`Starting to update pfp on ${platform.name}`);

			try {
				spinner.message(`Updating pfp on ${platform.name}`);
				const pfpUpdated = await platform.performUpdate(image);
				if (pfpUpdated.isErr()) {
					throw pfpUpdated.error;
				}

				spinner.stop(`Successfully updated pfp on ${platform.name}.`);
				return Ok();
			} catch (err) {
				spinner.clear();
				log.error(`Something went wrong while updating your pfp on ${platform.name}. See the error message below:\n\n${err}`);
				return Err(`${err}`);
			}
		};
	};
}

export function prepareUpdaterViaBrowser(browser: Browser, image: string): (platform: PlatformViaBrowser) => (spinner: SpinnerResult) => Promise<Result> {
	return (platform) => {
		return async (spinner) => {
			spinner.start(`Starting to update pfp on ${platform.name}`);

			try {
				let context: BrowserContext;

				if (await fs.exists(platform.cookiesPath)) {
					context = await browser.newContext({ storageState: platform.cookiesPath });
				} else {
					context = await browser.newContext();
				}

				const page = await context.newPage();

				spinner.message(`Checking account status on ${platform.name}`);
				const accountLoggedIn = await platform.checkStatus(page);
				if (accountLoggedIn.isErr()) {
					await page.close();
					await context.close();
					throw accountLoggedIn.error;
				}

				if (accountLoggedIn.isOk() && !accountLoggedIn.value) {
					spinner.message(`Logging in to ${platform.name}`);
					const loggingIn = await platform.performLogin(page);
					if (loggingIn.isErr()) {
						await page.close();
						await context.close();
						throw loggingIn.error;
					}
				}

				await context.storageState({ path: platform.cookiesPath });

				spinner.message(`Updating pfp on ${platform.name}`);
				const pfpUpdated = await platform.performUpdate(page, image);
				if (pfpUpdated.isErr()) {
					await page.close();
					await context.close();
					throw pfpUpdated.error;
				}

				await page.close();
				await context.close();

				spinner.stop(`Successfully updated pfp on ${platform.name}.`);
				return Ok();
			} catch (err) {
				spinner.clear();
				log.error(`Something went wrong while updating your pfp on ${platform.name}. See the error message below:\n\n${err}`);
				return Err(`${err}`);
			}
		};
	};
}
