import { World } from "miniplex";
import { describe, expect, it } from "vitest";

import { createControlState } from "../src/config/control";
import {
	createCarryState,
	createOrder,
	type DishRecipe,
} from "../src/config/recipes";

const TEST_RECIPE: DishRecipe = {
	id: "test-recipe",
	name: "Тестовый",
	dish: "dish-burger",
	layers: ["bun"],
	order: "layered",
	finishAt: "serving-counter",
};
import { createCookBadgeSystem } from "../src/systems/cook-badge";
import { spawnGlobalConfig } from "../src/core/spawn";
import type { CookBadge } from "../src/ui/cook-badge";
import type { Entity } from "../src/core/world";

function graphics() {
	const chain = {
		clear() {
			return chain;
		},
		circle() {
			return chain;
		},
		rect() {
			return chain;
		},
		fill() {
			return chain;
		},
	};
	return chain;
}

function badge(): CookBadge {
	return {
		root: { position: { set() {} } },
		label: { visible: true },
		dish: { visible: false, text: "" },
		carry: { visible: false, position: { x: 0 } },
		dots: graphics(),
		bar: graphics(),
		signature: "",
	} as unknown as CookBadge;
}

function worldWithCook() {
	const world = new World<Entity>();
	const cook: Entity = {
		position: { x: 100, y: 100 },
		order: createOrder(TEST_RECIPE),
		carry: createCarryState(),
		control: createControlState("auto"),
		badge: badge(),
	};
	world.add(cook);
	return { world, cook };
}

describe("config в системе бейджей", () => {
	it("сущность config находится и имена видны по умолчанию", () => {
		const { world, cook } = worldWithCook();
		const config = spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		expect(config.namesVisible).toBe(true);
		system();
		expect(cook.badge?.label.visible).toBe(true);
	});

	it("config должен существовать до создания системы, иначе флаг не читается", () => {
		const { world } = worldWithCook();
		const system = createCookBadgeSystem({ world } as never);

		// сущности config ещё нет — система обязана не падать и ждать её
		expect(() => system()).not.toThrow();
	});

	it("выключение флага в конфиге прячет имена", () => {
		const { world, cook } = worldWithCook();
		const config = spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		system();
		expect(cook.badge?.label.visible).toBe(true);

		config.namesVisible = false;
		system();

		expect(cook.badge?.label.visible).toBe(false);
	});

	it("обратное переключение возвращает имена", () => {
		const { world, cook } = worldWithCook();
		const config = spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		config.namesVisible = false;
		system();
		expect(cook.badge?.label.visible).toBe(false);

		config.namesVisible = true;
		system();
		expect(cook.badge?.label.visible).toBe(true);
	});

	it("config создаётся один раз, повторный вызов не плодит сущности", () => {
		const { world } = worldWithCook();

		const first = spawnGlobalConfig(world);
		const second = spawnGlobalConfig(world);

		expect(second).toBe(first);
		expect([...world].filter((e) => e.config).length).toBe(1);
	});

	it("название блюда показывается, пока заказ активен", () => {
		const { world, cook } = worldWithCook();
		spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		system();
		expect(cook.badge?.dish.visible).toBe(true);
		expect(cook.badge?.dish.text).toBe(TEST_RECIPE.name);

		cook.order = null;
		system();
		expect(cook.badge?.dish.visible).toBe(false);
	});

	it("флаги разных config не путаются между поварами", () => {
		const world = new World<Entity>();
		const visibleBadge = badge();
		const hiddenBadge = badge();

		for (const [entityBadge, y] of [
			[visibleBadge, 100],
			[hiddenBadge, 200],
		] as const) {
			world.add({
				position: { x: 100, y },
				order: createOrder(TEST_RECIPE),
				carry: createCarryState(),
				control: createControlState("auto"),
				badge: entityBadge,
			});
		}

		spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		system();

		expect(visibleBadge.label.visible).toBe(true);
		expect(hiddenBadge.label.visible).toBe(true);
	});

	it("config, созданный после системы, всё равно читается", () => {
		const world = new World<Entity>();
		world.add({
			position: { x: 100, y: 100 },
			order: createOrder(TEST_RECIPE),
			carry: createCarryState(),
			control: createControlState("auto"),
			badge: badge(),
		});

		const system = createCookBadgeSystem({ world } as never);
		system();

		spawnGlobalConfig(world);
		const config = [...world].find((entity) => entity.config)?.config;

		if (!config) {
			throw new Error("config не создан");
		}

		config.namesVisible = false;
		system();

		const cook = [...world].find((entity) => entity.badge)!;
		expect(cook.badge?.label.visible).toBe(false);
	});

	it("после пересоздания config система видит новую сущность, а не старую", () => {
		const { world } = worldWithCook();
		spawnGlobalConfig(world);
		const system = createCookBadgeSystem({ world } as never);

		// reset() чистит мир и создаёт поле заново
		world.clear();
		world.add({
			position: { x: 100, y: 100 },
			order: createOrder(TEST_RECIPE),
			carry: createCarryState(),
			control: createControlState("auto"),
			badge: badge(),
		});

		const fresh = spawnGlobalConfig(world);
		fresh.namesVisible = false;
		system();

		const cook = [...world].find((entity) => entity.badge)!;
		expect(cook.badge?.label.visible).toBe(false);
	});
});
