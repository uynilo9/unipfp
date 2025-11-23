import * as fs from "@std/fs";

import type { BrowserContext } from "./types.ts";

import { createBrowser } from "./utils/browser.ts";
import GitHub from "./plats/github.ts";

const img = "";

async function main() {
    await fs.ensureDir("cookies");

    const browser = await createBrowser();
    try {
        let context: BrowserContext;
        const github = GitHub;

        if (await fs.exists(github.cookiesPath))
            context = await browser.newContext({ storageState: github.cookiesPath });
        else
            context = await browser.newContext();

        const page = await context.newPage();
        const loggedIn = await github.checkStatus(page);

        if (!loggedIn) {
            await github.performLogin(page);
            await github.performVerify(page);
            await page.waitForURL(url => url.href === github.homeUrl);

            await context.storageState({ path: github.cookiesPath });
        }

        await github.performUpdate(page, img);

        await page.close();
        await context.close();
    } catch (err) {
        throw err;
    } finally {
        await browser.close();
    }
}

await main();
