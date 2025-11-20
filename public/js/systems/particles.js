import { layers } from '../core/app.js';
import { COLORS } from '../config/constants.js';

const particles = [];

export function spawnTrail(x, y) {
    const p = new PIXI.Graphics();
    p.beginFill(COLORS.PRIMARY, 0.5);
    p.drawCircle(0, 0, Math.random() * 4 + 2);
    p.endFill();

    p.x = x + (Math.random() - 0.5) * 15;
    p.y = y + (Math.random() - 0.5) * 15;

    layers.trails.addChild(p);
    particles.push({ sprite: p, life: 1.0 });
}

export function updateParticles(delta) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.05 * delta;
        
        p.sprite.alpha = p.life;
        p.sprite.scale.set(p.life);

        if (p.life <= 0) {
            p.sprite.destroy();
            particles.splice(i, 1);
        }
    }
}