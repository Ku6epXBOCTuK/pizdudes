import { Container, Graphics, Text } from "pixi.js";

import type { Item, OrderState } from "../config/recipes";

const LABEL_COLOR = 0xf2f4f8;
const LABEL_FONT_SIZE = 12;
const CARRY_FONT_SIZE = 16;
const EMOJI_FONT =
	'"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
const DOT_RADIUS = 4;
const DOT_SPACING = 13;
const LABEL_OFFSET_Y = 0;
const CARRY_OFFSET_Y = 20;
const DOT_OFFSET_Y = 38;
const DOT_DONE_COLOR = 0xf5c542;
const DOT_PENDING_COLOR = 0x7c8698;

const CARRY_EMOJI: Record<Item, string> = {
	bun: "🍞",
	sauce: "🥫",
	patty: "🥩",
	cheese: "🧀",
	salad: "🥬",
	tomato: "🍅",
	burger: "🍔",
};

export const BADGE_OFFSET_Y = 62;

export interface CookBadge {
	root: Container;
	label: Text;
	carry: Text;
	dots: Graphics;
	signature: string;
}

export function createCookBadge(name: string): CookBadge {
	const label = new Text({
		text: name,
		style: {
			fill: LABEL_COLOR,
			fontSize: LABEL_FONT_SIZE,
			fontFamily: "Verdana, sans-serif",
			stroke: { color: 0x10131a, width: 3 },
		},
	});
	label.anchor.set(0.5);
	label.position.set(0, LABEL_OFFSET_Y);

	const carry = new Text({
		text: "",
		style: {
			fill: LABEL_COLOR,
			fontSize: CARRY_FONT_SIZE,
			fontFamily: EMOJI_FONT,
			stroke: { color: 0x10131a, width: 3 },
		},
	});
	carry.anchor.set(0.5);
	carry.position.set(0, CARRY_OFFSET_Y);

	const dots = new Graphics();

	const root = new Container({ label: "cook-badge" });
	root.addChild(label, carry, dots);

	return { root, label, carry, dots, signature: "" };
}

export function carryEmoji(item: Item | null): string {
	return item ? CARRY_EMOJI[item] : "";
}

export function drawCookBadge(
	badge: CookBadge,
	order: OrderState | null,
	carried: Item | null,
) {
	badge.carry.text = carryEmoji(carried);
	badge.dots.clear();

	if (!order) {
		return;
	}

	const total = order.target.length;
	const placed = order.placed.length;
	const startX = -((total - 1) * DOT_SPACING) / 2;

	for (let index = 0; index < total; index++) {
		badge.dots
			.circle(startX + index * DOT_SPACING, DOT_OFFSET_Y, DOT_RADIUS)
			.fill(index < placed ? DOT_DONE_COLOR : DOT_PENDING_COLOR);
	}
}
