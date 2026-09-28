import { Container, Graphics, Text } from "pixi.js";

import { buildLegend } from "../config/legend";

const FONT_SIZE = 15;
const TEXT_COLOR = 0xdde3ec;
const STRIP_HEIGHT = 30;
const BOTTOM_MARGIN = 4;
const SPEED_PX_PER_SEC = 40;

export interface MarqueeView {
	root: Container;
	strip: Container;
	mask: Graphics;
	label: Text;
	maskedWidth: number;
	started: boolean;
}

export interface MarqueeScreen {
	width: number;
	height: number;
}

export function createMarquee(content: string = buildLegend()): MarqueeView {
	const label = new Text({
		text: content,
		style: {
			fill: TEXT_COLOR,
			fontSize: FONT_SIZE,
			fontFamily: "Verdana, sans-serif",
			stroke: { color: 0x10131a, width: 3 },
		},
	});
	label.anchor.set(0, 0.5);
	label.position.set(0, STRIP_HEIGHT / 2);
	label.resolution = 2;

	const strip = new Container({ label: "marquee-strip" });
	strip.addChild(label);

	const mask = new Graphics();
	mask.rect(0, 0, 1, STRIP_HEIGHT).fill(0xffffff);

	const root = new Container({ label: "marquee" });
	root.addChild(strip, mask);
	strip.mask = mask;

	return { root, strip, mask, label, maskedWidth: -1, started: false };
}

export function updateMarquee(
	view: MarqueeView,
	screen: MarqueeScreen,
	dt: number,
) {
	view.root.position.set(0, screen.height - STRIP_HEIGHT - BOTTOM_MARGIN);

	if (view.maskedWidth !== screen.width) {
		view.maskedWidth = screen.width;
		view.mask.clear().rect(0, 0, screen.width, STRIP_HEIGHT).fill(0xffffff);
	}

	if (!view.started) {
		view.started = true;
		view.strip.x = screen.width;
	}

	view.strip.x -= (SPEED_PX_PER_SEC * dt) / 1000;

	if (view.strip.x + view.label.width <= 0) {
		view.strip.x = screen.width;
	}
}
