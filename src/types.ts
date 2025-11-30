import type { Page } from "playwright";

type ResultOk<T> = { value: T };
type ResultErr<E> = { error: E };
export type Result<T = null, E = Error> =
	| (ResultOk<T> & { isOk(): this is ResultOk<T>; isErr(): this is ResultErr<E> })
	| (ResultErr<E> & { isOk(): this is ResultOk<T>; isErr(): this is ResultErr<E> });

export const Ok = <T>(value: T): Result<T, never> => ({ value, isOk: () => true, isErr: () => false } as Result<T, never>);
export const Err = <E>(error: E): Result<never, E> => ({ error, isOk: () => false, isErr: () => true } as Result<never, E>);

export interface PlatformViaBrowser {
	name: string;
	homeUrl: string;
	loginUrl: string;
	settingsUrl: string;
	cookiesPath: string;

	credentials: {
		email?: string;
		username?: string;
		password?: string;
		secret?: string;
	};

	checkStatus(page: Page): Promise<Result<boolean>>;
	performLogin(page: Page): Promise<Result>;
	performVerify(page: Page): Promise<Result>;
	performUpdate(page: Page, image: string): Promise<Result>;
}

export type { Browser, BrowserContext, Page } from "playwright";
