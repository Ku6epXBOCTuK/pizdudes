export type DevCommand =
	| { kind: "spawn-bots"; count: number }
	| { kind: "clear-bots" }
	| { kind: "report-count" }
	| { kind: "report-stats" };

export const MAX_TEST_BOTS = 500;

const COMMAND_SPAWN = "!тест";
const COMMAND_CLEAR = "!сброс";
const COMMAND_COUNT = "!счет";
const COMMAND_STATS = "!статс";

export function parseDevCommand(text: string): DevCommand | null {
	// ё → е, чтобы !счёт и !счет работали одинаково
	const message = text.trim().toLowerCase().replace(/ё/g, "е");
	const [word = "", rest = ""] = message.split(/\s+/);

	if (word.startsWith(COMMAND_SPAWN)) {
		// принимаем и !тест 100, и !тест100
		const raw = `${word.slice(COMMAND_SPAWN.length)}${rest}`.trim();
		const count = Number.parseInt(raw, 10);

		if (!Number.isFinite(count) || count < 1) {
			return null;
		}

		return { kind: "spawn-bots", count: Math.min(count, MAX_TEST_BOTS) };
	}

	switch (word) {
		case COMMAND_CLEAR:
			return { kind: "clear-bots" };

		case COMMAND_COUNT:
			return { kind: "report-count" };

		case COMMAND_STATS:
			return { kind: "report-stats" };

		default:
			return null;
	}
}
