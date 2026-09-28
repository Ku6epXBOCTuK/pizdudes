import { ChatClient } from "@twurple/chat";

import type { CookRequest } from "../config/control";
import type { CookIdentity } from "../core/world";
import { parseCommand } from "./commands";
import type { TwitchConfig } from "./config";

export interface TwitchChat {
	connect(): void;
	disconnect(): void;
	onConnect(callback: () => void): void;
	onError(callback: (error: Error) => void): void;
}

export interface TwitchMessage {
	cook: CookIdentity;
	request: CookRequest | null;
}

export function createTwitchChat(
	config: TwitchConfig,
	onMessage: (message: TwitchMessage) => void,
): TwitchChat {
	const client = new ChatClient({
		channels: [config.channel],
	});

	const connectHandlers: Array<() => void> = [];
	const errorHandlers: Array<(error: Error) => void> = [];

	const report = (error: Error) => {
		console.error(`[twitch] ${error.message}`);

		for (const handler of errorHandlers) {
			handler(error);
		}
	};

	client.onConnect(() => {
		console.info(
			`[twitch] connected, channels: ${client.currentChannels.join(", ")}`,
		);

		for (const handler of connectHandlers) {
			handler();
		}
	});

	client.onDisconnect((manually, reason) => {
		console.info(
			`[twitch] disconnected (manually=${String(manually)}): ${reason?.message ?? "no reason given"}`,
		);
	});

	client.onJoinFailure((channel, reason) => {
		report(new Error(`could not join #${channel}: ${reason}`));
	});

	client.onMessage((_channel, author, text, message) => {
		const request = parseCommand(text);

		if (!request) {
			console.debug(`[twitch] ${author}: ${text}`);
		}

		onMessage({
			cook: {
				userId: message.userInfo.userId,
				name: message.userInfo.displayName,
			},
			request,
		});
	});

	return {
		connect() {
			console.info(`[twitch] connecting to #${config.channel}...`);

			try {
				client.connect();
			} catch (error) {
				report(error instanceof Error ? error : new Error(String(error)));
			}
		},

		disconnect() {
			client.quit();
		},

		onConnect(callback) {
			connectHandlers.push(callback);
		},

		onError(callback) {
			errorHandlers.push(callback);
		},
	};
}
