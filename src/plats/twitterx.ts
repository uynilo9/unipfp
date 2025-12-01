import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { Page, PlatformViaBrowser, Result } from "../types.ts";

import { typeLikeAHuman } from "../utils/browser.ts";
import { generateTotp } from "../utils/totp.ts";

export default <PlatformViaBrowser> {
    name: "Twitter(X)",
    homeUrl: "https://x.com/",
    loginUrl: "https://x.com/login",
    settingsUrl: "https://x.com/settings/profile",
    cookiesPath: "cookies/twitterx.json",

    credentials: {
        email: "",
        username: Deno.env.get("TWITTERX_USERNAME"),
        password: Deno.env.get("TWITTERX_PASSWORD"),
        secret: Deno.env.get("TWITTERX_SECRET"),
    },

    async checkStatus(page: Page): Promise<Result<boolean>> {
        await page.goto(this.loginUrl);
        await page.locator("input[autocomplete=username], button[data-testid=SideNav_AccountSwitcher_Button]").waitFor();

        return Ok(await page.locator("button[data-testid=SideNav_AccountSwitcher_Button]").isVisible());
    },

    async performLogin(page: Page): Promise<Result> {
        // await page.goto(this.loginUrl);

        const username = this.credentials.username;
        const password = this.credentials.password;
        if (!username || !password) {
            return Err(new Error("Could not find the Twitter(X) username or password. Please check out your environment file."));
        }

        const usernameInput = page.locator("input[autocomplete=username]");
        await usernameInput.waitFor();
        await typeLikeAHuman(page, "input[autocomplete=username]", username);
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");

        await page.locator("div[data-testid=toast], input[autocomplete=current-password]").waitFor();

        if (await page.locator("div[data-testid=toast]").isVisible()) {
            return Err(new Error("Wrong Twitter(X) username. Please check out your environment file."));
        }

        const passwordInput = page.locator("input[autocomplete=current-password]");
        await passwordInput.waitFor();
        await typeLikeAHuman(page, "input[autocomplete=current-password]", password);
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");

        await page.locator("div[data-testid=toast], button[data-testid=SideNav_AccountSwitcher_Button], input[data-testid=ocfEnterTextTextInput]").waitFor();

        if (await page.locator("div[data-testid=toast]").isVisible()) {
            return Err(new Error("Wrong Twitter(X) password. Please check out your environment file."));
        } else if (await page.locator("button[data-testid=SideNav_AccountSwitcher_Button]").isVisible()) {
            return Ok();
        } else if (await page.locator("input[data-testid=ocfEnterTextTextInput]").isVisible()) {
            return await this.performVerify(page);
        }

        return Err(new Error("Unexpected error occurred while trying to log into Twitter(X)."));
    },

    async performVerify(page: Page): Promise<Result> {
        if (!await page.locator("input[data-testid=ocfEnterTextTextInput]").isVisible()) {
            return Err(new Error("Expected to find the TOTP input, but it was not found while trying to verify in Twitter(X)."));
        }

        const secret = this.credentials.secret;
        if (!secret) {
            return Err(new Error("Could not find the Twitter(X) 2FA secret. Please check out your environment file."));
        }

        const token = generateTotp(secret);
        if (token.isErr()) {
            return Err(token.error);
        }
        await typeLikeAHuman(page, "input[data-testid=ocfEnterTextTextInput]", token.value);
        await page.waitForTimeout(500);
        await page.keyboard.press("Enter");

        await page.locator("div[data-testid=toast], button[data-testid=SideNav_AccountSwitcher_Button]").waitFor();

        if (await page.locator("div[data-testid=toast]").isVisible()) {
            return Err(new Error("Wrong Twitter(X) TOTP. Please check out your Twitter(X) 2FA secret in your environment file."));
        } else if (await page.locator("button[data-testid=SideNav_AccountSwitcher_Button]").isVisible()) {
            return Ok();
        }

        return Err(new Error("Unexpected error occurred while trying to verify in Twitter(X)."));
    },

    async performUpdate(page: Page, image: string): Promise<Result> {
        await page.goto(this.settingsUrl);

        const imageInput = page.locator("input[data-testid=fileInput]").nth(1);
        await imageInput.setInputFiles(image);

        const applyButton = page.locator("button[data-testid=applyButton]");
        await applyButton.waitFor();
        await applyButton.click();

        const saveButton = page.locator("button[data-testid=Profile_Save_Button]");
        await saveButton.waitFor();
        await saveButton.click();

        try {
            await saveButton.waitFor({ state: "hidden" });
            await page.waitForTimeout(500);

            return Ok();
        } catch {
            return Err(new Error("Unexpected error occurred while trying to update your pfp in Twitter(X)."));
        }
    },
};
