import { describe, expect, it } from "vitest";

import { DEV_SPAWN } from "../src/config/dev-spawn";
import { pickIntent } from "../src/systems/dev-spawn";
import { parseCommand } from "../src/twitch/commands";
import { parseDevCommand } from "../src/twitch/dev-commands";

const MAX_TEST_BOTS = DEV_SPAWN.maxBots;

function sequence(values: number[]): () => number {
	let index = 0;
	return () => values[index++ % values.length]!;
}

describe("parseDevCommand", () => {
	it("!тест 100 просит 100 ботов", () => {
		expect(parseDevCommand("!тест 100")).toEqual({
			kind: "spawn-bots",
			count: 100,
		});
	});

	it("!тест100 без пробела работает так же", () => {
		expect(parseDevCommand("!тест100")).toEqual({
			kind: "spawn-bots",
			count: 100,
		});
	});

	it("регистр и лишние пробелы не важны", () => {
		expect(parseDevCommand("  !ТЕСТ   42  ")).toEqual({
			kind: "spawn-bots",
			count: 42,
		});
	});

	it("парсер не режет число: потолок ставит спавн", () => {
		expect(parseDevCommand(`!тест ${MAX_TEST_BOTS * 10}`)).toEqual({
			kind: "spawn-bots",
			count: MAX_TEST_BOTS * 10,
		});
	});

	it("!сброс без аргументов", () => {
		expect(parseDevCommand("!сброс")).toEqual({ kind: "clear-bots" });
	});

	it("!счёт и !счет — одна команда", () => {
		expect(parseDevCommand("!счёт")).toEqual({ kind: "report-count" });
		expect(parseDevCommand("!счет")).toEqual({ kind: "report-count" });
	});

	it("!статс", () => {
		expect(parseDevCommand("!статс")).toEqual({ kind: "report-stats" });
	});

	it.each(["!тест", "!тест 0", "!тест -5", "!тест миллион", "!тест-дрова"])(
		"%s — некорректное число, команда не распознаётся",
		(text) => {
			expect(parseDevCommand(text)).toBeNull();
		},
	);

	it.each(["привет", "!взять", "!отдать", "!положить сыр", "тест 100"])(
		"%s не является тестовой командой",
		(text) => {
			expect(parseDevCommand(text)).toBeNull();
		},
	);
});

describe("игровые команды новой модели", () => {
	it.each([
		["!резать", "cutting-board"],
		["!жарить", "grill"],
		["!варить", "stove-pot"],
		["!месить", "dough-mixer"],
		["!печь", "pizza-oven"],
	] as const)("%s → transform на %s", (word, at) => {
		expect(parseCommand(word)).toEqual({ kind: "transform", at });
	});

	it("!взять с неизвестным предметом не распознаётся", () => {
		expect(parseCommand("!взять вилку")).toBeNull();
	});

	it("!взять понимает русские подписи и id", () => {
		expect(parseCommand("!взять помидор")).toEqual({
			kind: "take",
			item: "tomato",
		});
		expect(parseCommand("!взять tomato")).toEqual({
			kind: "take",
			item: "tomato",
		});
	});
});

describe("тестовые команды не конфликтуют с игровыми", () => {
	it("!заказ остаётся игровой командой", () => {
		expect(parseCommand("!заказ")).toEqual({ kind: "get-order" });
		expect(parseDevCommand("!заказ")).toBeNull();
	});

	it.each(["!положить", "!положи"])("%s остаётся игровой командой", (text) => {
		expect(parseCommand(text)).toEqual({ kind: "place" });
		expect(parseDevCommand(text)).toBeNull();
	});

	it("!взять сыр остаётся игровой командой", () => {
		expect(parseCommand("!взять сыр")).toEqual({
			kind: "take",
			item: "cheese",
		});
		expect(parseDevCommand("!взять сыр")).toBeNull();
	});

	it("!выкинь остаётся игровой командой", () => {
		expect(parseCommand("!выкинь")).toEqual({ kind: "drop" });
		expect(parseDevCommand("!выкинь")).toBeNull();
	});

	it("!отдать остаётся игровой командой", () => {
		expect(parseCommand("!отдать")).toEqual({ kind: "deliver" });
		expect(parseDevCommand("!отдать")).toBeNull();
	});
});

describe("pickIntent", () => {
	it("wanderChance 0 — все работают", () => {
		expect(pickIntent(() => 0, 0)).toBe("work");
		expect(pickIntent(() => 0.99, 0)).toBe("work");
	});

	it("wanderChance 1 — все бродят", () => {
		expect(pickIntent(() => 0.99, 1)).toBe("idle");
	});

	it("порог разделяет: сэмпл ниже шанса — блуждание, выше — работа", () => {
		expect(pickIntent(() => 0.29, 0.3)).toBe("idle");
		expect(pickIntent(() => 0.31, 0.3)).toBe("work");
	});

	it("дефолтный шанс даёт оба режима на реальной последовательности", () => {
		const random = sequence([0.1, 0.9]);
		expect(pickIntent(random)).toBe("idle");
		expect(pickIntent(random)).toBe("work");
	});
});
