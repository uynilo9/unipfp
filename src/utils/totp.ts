import * as otpauth from "@hectorm/otpauth";

import { Err, Ok } from "../types.ts";
import type { Result } from "../types.ts";

export function generateTotp(secret: string): Result<string> {
	const totp = new otpauth.TOTP({
		algorithm: "SHA1",
		digits: 6,
		period: 30,
		secret: otpauth.Secret.fromBase32(secret.trim()),
	});

	try {
		return Ok(totp.generate());
	} catch (err) {
		throw Err(err);
	}
}
