export interface TwitchConfig {
	channel: string;
	ownerId: string | null;
}

export function readTwitchConfig(
	env: Record<string, string | undefined> = import.meta.env,
): TwitchConfig | null {
	const channel = env.VITE_TWITCH_CHANNEL?.trim().replace(/^#/, "");

	if (!channel) {
		return null;
	}

	return {
		channel,
		ownerId: env.VITE_TWITCH_OWNER_ID?.trim() || null,
	};
}
