import * as fs from "@std/fs";

import { Err, Ok } from "../types.ts";
import type { Browser, BrowserContext, PlatformViaApi, PlatformViaBrowser, Result } from "../types.ts";

export async function updatePfpViaApi(platform: PlatformViaApi, image: string): Promise<Result<string>> {
    const pfpUpdated = await platform.performUpdate(image);
    if (pfpUpdated.isErr()) {
        return Err(pfpUpdated.error);
    }

    return Ok(`Successfully updated pfp on ${platform.name}.`);
}

export async function updatePfpViaBrowser(browser: Browser, platform: PlatformViaBrowser, image: string): Promise<Result<string>> {
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
}