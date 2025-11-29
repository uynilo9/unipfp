import type { Page } from "playwright";

export type Result<T = null, E = Error> =
	| { type: "ok"; value: T }
	| { type: "err"; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ type: "ok", value });
export const Err = <E>(error: E): Result<never, E> => ({ type: "err", error });

export interface Platform {
	name: string;
	homeUrl: string;
	loginUrl: string;
	settingsUrl: string;
	cookiesPath: string;

	credentials: {
		username?: string;
		password?: string;
		secret?: string;
	};

	checkStatus(page: Page): Promise<Result<boolean>>;
	performLogin(page: Page): Promise<Result>;
	performVerify(page: Page): Promise<Result>;
	performUpdate(page: Page, img: string): Promise<Result>;
}

export type { Browser, BrowserContext, Page } from "playwright";
