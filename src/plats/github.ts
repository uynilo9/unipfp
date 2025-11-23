import "@std/dotenv/load";

import type { Page, Platform } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";

export default <Platform> {
    name:        "GitHub",
    homeUrl:     "https://github.com/",
    loginUrl:    "https://github.com/login",
    settingsUrl: "https://github.com/settings/profile",
    cookiesPath: "cookies/github.json",

    credentials: {
        username: Deno.env.get("GITHUB_USERNAME"),
        password: Deno.env.get("GITHUB_PASSWORD"),
    },

    async checkStatus(page: Page) {
        await page.goto(this.loginUrl);
        return await page.locator("body.logged-out").isHidden();
    },

    async performLogin(page: Page) {
        await page.goto(this.loginUrl);

        const username = this.credentials.username;
        const password = this.credentials.password;

        if (username&&password) {
            await typeLikeAHuman(page, "#login_field", username);
            await typeLikeAHuman(page, "#password", password);

            await page.click("input[type=\"submit\"]");
        }
    },

    async performUpdate(page: Page, img: string) {
        await page.goto(this.settingsUrl);

        const imgInput = page.locator("input[type=\"file\"]#avatar_upload");
        await imgInput.setInputFiles(img);

        const setButton = page.locator("button:has-text(\"Set new profile picture\")");
        await setButton.waitFor();
        await setButton.click();

        await page.waitForTimeout(3000);
    }
};
