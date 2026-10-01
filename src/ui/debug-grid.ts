import { type Application, Container, Graphics, Text } from "pixi.js";

import {
	CELL_SIZE,
	gridMetrics,
	slotPosition,
	STATION_PLACEMENT,
} from "../config/field";

const GRID_LABEL = "debug-grid";

function axisLabel(text: string, x: number, y: number): Text {
	const label = new Text({
		text,
		style: { fill: 0xffffff, fontSize: 13, fontWeight: "bold" },
		alpha: 0.75,
	});
	label.position.set(x, y);
	return label;
}

function buildGrid(screen: { width: number; height: number }): Container {
	const root = new Container({ label: GRID_LABEL });
	const { columns, rows, offsetX, offsetY } = gridMetrics(screen);
	const gridWidth = columns * CELL_SIZE;
	const gridHeight = rows * CELL_SIZE;

	const graphics = new Graphics();

	for (let column = 0; column <= columns; column++) {
		const x = offsetX + column * CELL_SIZE;
		graphics
			.moveTo(x, offsetY)
			.lineTo(x, offsetY + gridHeight)
			.stroke({ color: 0xffffff, alpha: 0.3, width: 1 });
	}

	for (let row = 0; row <= rows; row++) {
		const y = offsetY + row * CELL_SIZE;
		graphics
			.moveTo(offsetX, y)
			.lineTo(offsetX + gridWidth, y)
			.stroke({ color: 0xffffff, alpha: 0.3, width: 1 });
	}

	for (let column = 0; column < columns; column++) {
		const letter = String.fromCharCode("a".charCodeAt(0) + column);
		const x = offsetX + column * CELL_SIZE;

		root.addChild(axisLabel(letter, x + 4, offsetY + 2));
	}

	for (let row = 0; row < rows; row++) {
		const y = offsetY + row * CELL_SIZE;

		root.addChild(
			axisLabel(String(row + 1), offsetX + 4, y + CELL_SIZE / 2 - 7),
		);
	}

	for (const placement of STATION_PLACEMENT) {
		const center = slotPosition(placement, screen);
		const x = center.x - CELL_SIZE / 2;
		const y = center.y - CELL_SIZE / 2;

		graphics
			.rect(x, y, CELL_SIZE, CELL_SIZE)
			.fill({ color: 0x4a90d9, alpha: 0.3 })
			.stroke({ color: 0x4a90d9, alpha: 0.8, width: 2 });
	}

	root.addChildAt(graphics, 0);
	return root;
}

export function attachDebugGrid(
	layer: Container,
	renderer: Application["renderer"],
): () => void {
	let current = buildGrid(renderer.screen);
	layer.addChild(current);

	const redraw = () => {
		layer.removeChild(current);
		current.destroy({ children: true });
		current = buildGrid(renderer.screen);
		layer.addChild(current);
	};

	renderer.on("resize", redraw);

	return () => {
		layer.removeChild(current);
		current.destroy({ children: true });
	};
}
