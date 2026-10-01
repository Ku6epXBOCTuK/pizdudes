import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ITEM_ICONS } from "../src/config/item-icons";
import { DISHES, RAW_ITEMS, SEMI_ITEMS } from "../src/config/recipes";

const FOOD_DIR = join(__dirname, "..", "assets", "food");

describe("ITEM_ICONS", () => {
	it("ключи — известные предметы каталога", () => {
		const known: readonly string[] = [...RAW_ITEMS, ...SEMI_ITEMS, ...DISHES];

		for (const key of Object.keys(ITEM_ICONS)) {
			expect(known).toContain(key);
		}
	});

	it("каждый маппинг указывает на существующий файл", () => {
		for (const path of Object.values(ITEM_ICONS)) {
			expect(existsSync(join(FOOD_DIR, path!)), path).toBe(true);
		}
	});
});
