import { layers } from '../core/app.js';
import { COLORS, WORLD } from '../config/constants.js';

export function createGrid() {
    const grid = new PIXI.Graphics();
    grid.lineStyle(1, COLORS.GRID, 1);

    for (let x = 0; x <= WORLD.SIZE; x += WORLD.GRID_SIZE) {
        grid.moveTo(x, 0);
        grid.lineTo(x, WORLD.SIZE);
    }
    for (let y = 0; y <= WORLD.SIZE; y += WORLD.GRID_SIZE) {
        grid.moveTo(0, y);
        grid.lineTo(WORLD.SIZE, y);
    }

    layers.grid.addChild(grid);
}