import { describe, expect, it } from "vitest";

import { parseCommand } from "../src/twitch/commands";
import { MAX_TEST_BOTS, parseDevCommand } from "../src/twitch/dev-commands";

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

	it("ограничивает количество потолком", () => {
		expect(parseDevCommand(`!тест ${MAX_TEST_BOTS * 10}`)).toEqual({
			kind: "spawn-bots",
			count: MAX_TEST_BOTS,
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

describe("тестовые команды не конфликтуют с игровыми", () => {
	it("!взять остаётся игровой командой", () => {
		expect(parseCommand("!взять")).toEqual({ kind: "get-order" });
		expect(parseDevCommand("!взять")).toBeNull();
	});

	it.each(["!положить сыр", "!положи сыр"])(
		"%s остаётся игровой командой",
		(text) => {
			expect(parseCommand(text)).toEqual({
				kind: "fetch",
				ingredient: "cheese",
			});
			expect(parseDevCommand(text)).toBeNull();
		},
	);

	it("!отдать остаётся игровой командой", () => {
		expect(parseCommand("!отдать")).toEqual({ kind: "deliver" });
		expect(parseDevCommand("!отдать")).toBeNull();
	});
});
