import * as path from "@std/path";

import { Err, Ok } from "../types.ts";
import type { Result } from "../types.ts";

export function getImageType(image: string): Result<string> {
	const ext = path.extname(image).toLowerCase();
	switch (ext) {
		case ".jpg":
		case ".jpeg":
			return Ok("image/jpeg");
		case ".png":
			return Ok("image/png");
		case ".gif":
			return Ok("image/gif");
		default:
			return Err("Unsupported the image type.");
	}
}
