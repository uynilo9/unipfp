import type { Page } from "playwright";

export interface Platform {
    name:        string;
    homeUrl:     string;
    loginUrl:    string;
    settingsUrl: string;
    cookiesPath: string;

    credentials: {
        username?: string;
        password?: string;
    };

    checkStatus(page: Page):                Promise<boolean>;
    performLogin(page: Page):               Promise<void>;
    performUpdate(page: Page, img: string): Promise<void>;
}

export type { Page } from "playwright";
