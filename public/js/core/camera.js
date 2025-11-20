import { app, world } from './app.js';

export function updateCamera(playerX, playerY) {
    const targetX = -playerX + window.innerWidth / 2;
    const targetY = -playerY + window.innerHeight / 2;

    // Lerp (Interpolación lineal) para suavidad: 0.1
    world.x += (targetX - world.x) * 0.1;
    world.y += (targetY - world.y) * 0.1;
}