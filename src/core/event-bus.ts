export const GameEvents = {
	START_GAME: Symbol("start-game"),
	PAUSE_GAME: Symbol("pause-game"),
	RESUME_GAME: Symbol("resume-game"),
	GAME_OVER: Symbol("game-over"),
	TO_MENU: Symbol("to-menu"),
} as const;

export type GameEventType = (typeof GameEvents)[keyof typeof GameEvents];

type EventDataMap = {
	[GameEvents.START_GAME]: undefined;
	[GameEvents.PAUSE_GAME]: undefined;
	[GameEvents.RESUME_GAME]: undefined;
	[GameEvents.GAME_OVER]: undefined;
	[GameEvents.TO_MENU]: undefined;
};

type EventCallback = (...args: unknown[]) => void;

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

	on(event: GameEventType, callback: EventCallback) {
		if (!listeners.has(event)) {
			listeners.set(event, new Set());
		}
		listeners.get(event)!.add(callback);
	},

	off(event: GameEventType, callback: EventCallback) {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(callback);
		}
	},
};
