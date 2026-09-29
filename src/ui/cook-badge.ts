import { Container, Graphics, Sprite, Text } from "pixi.js";

import { carryTexture } from "../assets/carry-emoji";
import type { Item, OrderState } from "../config/recipes";

const LABEL_COLOR = 0xf2f4f8;
const LABEL_FONT_SIZE = 12;
const CARRY_SIZE = 18;
const DOT_RADIUS = 4;
const DOT_SPACING = 12;
const DOT_DONE_COLOR = 0xf5c542;
const DOT_PENDING_COLOR = 0x7c8698;

const BAR_WIDTH = 46;
const BAR_HEIGHT = 4;
const BAR_TRACK_COLOR = 0x2a303c;
const BAR_FILL_COLOR = 0xf5c542;

const BAR_OFFSET_Y = 0;
const ROW_OFFSET_Y = 14;
const LABEL_OFFSET_Y = 30;
const ROW_GAP = 6;

const BADGE_SIGNATURE_NONE = -1;
const PROGRESS_NONE = 255;
const PROGRESS_STEPS = 100;

const ITEM_ORDER: (Item | null)[] = [
	null,
	"bun",
	"sauce",
	"patty",
	"cheese",
	"salad",
	"tomato",
	"burger",
];

const ITEM_CODE = new Map<Item | null, number>(
	ITEM_ORDER.map((item, index) => [item, index]),
);

export function badgeSignature(
	order: OrderState | null,
	carried: Item | null,
	progress: number | null,
): number {
	const item = ITEM_CODE.get(carried) ?? 0;
	const placed = order ? Math.min(99, order.placed.length) : 0;
	const target = order ? Math.min(99, order.target.length) : 0;
	const step =
		progress === null
			? PROGRESS_NONE
			: Math.min(PROGRESS_STEPS - 1, Math.floor(progress * PROGRESS_STEPS));

	return ((item * 100 + placed) * 100 + target) * 256 + step;
}

export const BADGE_OFFSET_Y = 72;

export interface CookBadge {
	root: Container;
	label: Text;
	carry: Sprite;
	dots: Graphics;
	bar: Graphics;
	signature: number;
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

	const carry = new Sprite();
	carry.anchor.set(0, 0.5);
	carry.position.set(0, ROW_OFFSET_Y);
	carry.visible = false;

	const dots = new Graphics();

	const bar = new Graphics();

	const root = new Container({ label: "cook-badge" });
	root.addChild(bar, carry, dots, label);

	return { root, label, carry, dots, bar, signature: BADGE_SIGNATURE_NONE };
}

export function drawCookBadge(
	badge: CookBadge,
	order: OrderState | null,
	carried: Item | null,
	progress: number | null,
) {
	const texture = carryTexture(carried);
	badge.carry.visible = texture !== null;

	if (texture) {
		badge.carry.texture = texture;
		badge.carry.width = CARRY_SIZE;
		badge.carry.height = CARRY_SIZE;
	}

	badge.dots.clear();
	badge.bar.clear();

	drawBar(badge, progress);

	if (!order) {
		badge.carry.position.x = 0;
		return;
	}

	const total = order.target.length;
	const placed = order.placed.length;

	const carryWidth = badge.carry.visible ? CARRY_SIZE : 0;
	const dotsWidth = (total - 1) * DOT_SPACING;
	const gap = carryWidth ? ROW_GAP : 0;
	const rowWidth = carryWidth + gap + dotsWidth;
	const firstDot = -rowWidth / 2 + carryWidth + gap + DOT_SPACING / 2;

	badge.carry.position.x = -rowWidth / 2;

	for (let index = 0; index < total; index++) {
		badge.dots
			.circle(firstDot + index * DOT_SPACING, ROW_OFFSET_Y, DOT_RADIUS)
			.fill(index < placed ? DOT_DONE_COLOR : DOT_PENDING_COLOR);
	}
}

function drawBar(badge: CookBadge, progress: number | null) {
	if (progress === null) {
		return;
	}

	const left = -BAR_WIDTH / 2;
	const filled = Math.max(0, Math.min(1, progress)) * BAR_WIDTH;

	badge.bar
		.rect(left, BAR_OFFSET_Y, BAR_WIDTH, BAR_HEIGHT)
		.fill(BAR_TRACK_COLOR);

	if (filled > 0) {
		badge.bar.rect(left, BAR_OFFSET_Y, filled, BAR_HEIGHT).fill(BAR_FILL_COLOR);
	}
}
