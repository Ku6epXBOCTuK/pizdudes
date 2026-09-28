import type { CookRequest } from "../config/control";
import type { CookIdentity } from "./world";

export interface ChatRequestEvent {
	cook: CookIdentity;
	request: CookRequest;
}

const START_GAME = Symbol("start-game");
const PAUSE_GAME = Symbol("pause-game");
const RESUME_GAME = Symbol("resume-game");
const GAME_OVER = Symbol("game-over");
const TO_MENU = Symbol("to-menu");
const CHAT_REQUEST = Symbol("chat-request");

export const GameEvents = {
	START_GAME,
	PAUSE_GAME,
	RESUME_GAME,
	GAME_OVER,
	TO_MENU,
	CHAT_REQUEST,
} as const;

export type GameEventType =
	| typeof START_GAME
	| typeof PAUSE_GAME
	| typeof RESUME_GAME
	| typeof GAME_OVER
	| typeof TO_MENU
	| typeof CHAT_REQUEST;

type EventDataMap = {
	[START_GAME]: undefined;
	[PAUSE_GAME]: undefined;
	[RESUME_GAME]: undefined;
	[GAME_OVER]: undefined;
	[TO_MENU]: undefined;
	[CHAT_REQUEST]: ChatRequestEvent;
};

type EventCallback = (...args: unknown[]) => void;

type EventListener<T extends GameEventType> = (data: EventDataMap[T]) => void;

const listeners = new Map<GameEventType, Set<EventCallback>>();

export const GameEngine = {
	emit<T extends GameEventType>(event: T, data?: EventDataMap[T]) {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			for (const callback of eventListeners) {
				callback(data);
			}
		}
	},

	on<T extends GameEventType>(event: T, callback: EventListener<T>) {
		if (!listeners.has(event)) {
			listeners.set(event, new Set());
		}
		listeners.get(event)!.add(callback as EventCallback);
	},

	off<T extends GameEventType>(event: T, callback: EventListener<T>) {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(callback as EventCallback);
		}
	},
};
