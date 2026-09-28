import { Container, Graphics, Text } from "pixi.js";

import type { OrderState } from "../config/recipes";

const LABEL_COLOR = 0xf2f4f8;
const LABEL_FONT_SIZE = 12;
const DOT_RADIUS = 4;
const DOT_SPACING = 13;
const DOT_OFFSET_Y = 20;
const DOT_DONE_COLOR = 0xf5c542;
const DOT_PENDING_COLOR = 0x7c8698;

export const BADGE_OFFSET_Y = 62;

export interface CookBadge {
	root: Container;
	label: Text;
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

	const dots = new Graphics();

	const root = new Container({ label: "cook-badge" });
	root.addChild(label, dots);

	return { root, label, dots, signature: "" };
}

export function drawCookBadge(badge: CookBadge, order: OrderState | null) {
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
