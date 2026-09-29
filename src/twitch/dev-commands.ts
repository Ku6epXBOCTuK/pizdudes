export type DevCommand =
	| { kind: "spawn-bots"; count: number }
	| { kind: "clear-bots" }
	| { kind: "report-count" }
	| { kind: "report-stats" }
	| { kind: "toggle-names" };

const COMMAND_SPAWN = "!тест";
const COMMAND_CLEAR = "!сброс";
const COMMAND_COUNT = "!счет";
const COMMAND_STATS = "!статс";
const COMMAND_NAMES = "!имена";

export function parseDevCommand(text: string): DevCommand | null {
	const message = text.trim().toLowerCase().replace(/ё/g, "е");
	const [word = "", rest = ""] = message.split(/\s+/);

	if (word.startsWith(COMMAND_SPAWN)) {
		const raw = `${word.slice(COMMAND_SPAWN.length)}${rest}`.trim();
		const count = Number.parseInt(raw, 10);

		if (!Number.isFinite(count) || count < 1) {
			return null;
		}

		return { kind: "spawn-bots", count };
	}

	switch (word) {
		case COMMAND_CLEAR:
			return { kind: "clear-bots" };

		case COMMAND_COUNT:
			return { kind: "report-count" };

		case COMMAND_STATS:
			return { kind: "report-stats" };

		case COMMAND_NAMES:
			return { kind: "toggle-names" };

		default:
			return null;
	}
}
