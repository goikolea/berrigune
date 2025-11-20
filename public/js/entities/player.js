import { layers } from '../core/app.js';
import { COLORS, PLAYER, WORLD } from '../config/constants.js';
import { spawnTrail } from '../systems/particles.js';

const state = {
    x: 2000, y: 2000,
    velX: 0, velY: 0,
    container: null,
    body: null,
    rotor: null,
    wobbleTime: 0
};

export function initPlayer() {
    const container = new PIXI.Container();
    container.x = state.x;
    container.y = state.y;

    // --- FIX IMPORTANTE ---
    // Hacemos que el jugador sea "fantasma" para los clics.
    // Así, si hay un rombo debajo, el clic lo atravesará y activará el rombo.
    container.eventMode = 'none'; 
    // ----------------------

    // Sombra
    const shadow = new PIXI.Graphics();
    shadow.beginFill(COLORS.SHADOW, 0.08);
    shadow.drawEllipse(0, 0, 20, 10);
    shadow.endFill();
    shadow.y = 28;
    
    // Rotor y Cuerpo
    const bodyRotor = new PIXI.Container();
    const body = new PIXI.Graphics();
    body.lineStyle(3, 0xFFFFFF, 1);
    body.beginFill(COLORS.PRIMARY);
    body.drawCircle(0, 0, 22);
    body.endFill();

    bodyRotor.addChild(body);
    container.addChild(shadow);
    container.addChild(bodyRotor);
    
    layers.player.addChild(container);

    state.container = container;
    state.body = body;
    state.rotor = bodyRotor;
}

export function updatePlayer(delta, input) {
    const { keys, target } = input;
    
    // 1. Input
    const dir = input.getDirection();
    
    if (dir.usingKeys) {
        state.velX += dir.x * PLAYER.ACCEL;
        state.velY += dir.y * PLAYER.ACCEL;
    } else if (target) {
        const dx = target.x - state.x;
        const dy = target.y - state.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 10) {
            const angle = Math.atan2(dy, dx);
            state.velX += Math.cos(angle) * PLAYER.ACCEL;
            state.velY += Math.sin(angle) * PLAYER.ACCEL;
        } else {
            input.target = null; 
        }
    }

    // 2. Físicas
    state.velX *= PLAYER.FRICTION;
    state.velY *= PLAYER.FRICTION;

    const speed = Math.sqrt(state.velX**2 + state.velY**2);
    if (speed > PLAYER.SPEED) {
        const ratio = PLAYER.SPEED / speed;
        state.velX *= ratio;
        state.velY *= ratio;
    }

    // 3. Movimiento
    state.x += state.velX * delta;
    state.y += state.velY * delta;
    state.x = Math.max(0, Math.min(state.x, WORLD.SIZE));
    state.y = Math.max(0, Math.min(state.y, WORLD.SIZE));

    state.container.x = state.x;
    state.container.y = state.y;

    // 4. Animación Jelly
    _animateJelly(speed, state.velX, state.velY, delta);

    // 5. Estelas
    if (speed > 4 && Math.random() > 0.6) {
        spawnTrail(state.x, state.y);
    }
}

function _animateJelly(speed, velX, velY, delta) {
    state.wobbleTime += 0.08 * delta;
    const breath = Math.sin(state.wobbleTime) * 0.02;
    const deform = Math.min(speed * 0.03, 0.15);

    const targetSx = 1 + deform + breath;
    const targetSy = 1 - deform + breath;
    state.body.scale.x += (targetSx - state.body.scale.x) * 0.1;
    state.body.scale.y += (targetSy - state.body.scale.y) * 0.1;

    if (speed > 0.5) {
        state.rotor.rotation = Math.atan2(velY, velX);
    }
}
export function getPlayerPos() {
    return { x: state.x, y: state.y };
}

// --- NUEVA FUNCIÓN ---
export function teleportPlayer(x, y) {
    state.x = x;
    state.y = y;
    state.velX = 0;
    state.velY = 0;
    state.container.x = x;
    state.container.y = y;
}