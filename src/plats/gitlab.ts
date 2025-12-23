import "@std/dotenv/load";

import { Err, Ok } from "../types.ts";
import type { PlatformViaApi, Result } from "../types.ts";

import { getImageType } from "../utils/image.ts";

export default <PlatformViaApi> {
	name: "GitLab",
	apiEndpoint: "https://gitlab.com/api/v4/user/avatar",

	credentials: {
		secret: Deno.env.get("GITLAB_SECRET"),
	},

	async performUpdate(image: string): Promise<Result> {
		const token = this.credentials.secret;
		if (!token) {
			return Err("Could not find the GitLab token. Please check out your environment file.");
		}

		try {
			const imageBlob = await Deno.readFile(image);
			const imageFilename = image.split("/").pop();

			const imageType = getImageType(image);
			if (imageType.isErr()) {
				return Err(imageType.error);
			}

			const formData = new FormData();
			formData.append("avatar", new Blob([imageBlob], { type: imageType.value }), imageFilename);

			const response = await fetch(this.apiEndpoint, {
				method: "PUT",
				headers: { "PRIVATE-TOKEN": token },
				body: formData,
			});
			if (!response.ok) {
				throw (await response.json()).message;
			}

			return Ok();
		} catch (err) {
			return Err(`${err}`);
		}
	},
};
