import * as otpauth from "@hectorm/otpauth";

export function generate2FAToken(secret: string): string {
    const totp = new otpauth.TOTP({
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: otpauth.Secret.fromBase32(secret.trim()), 
    });

    return totp.generate();
}