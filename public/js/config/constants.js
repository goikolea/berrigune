export const COLORS = {
    BACKGROUND: 0xF5F5F7,
    PRIMARY: 0x4A90E2,
    ACCENT: 0xFFD700,
    TEXT_DARK: 0x1a1a1a,
    GRID: 0xE0E0E0,
    SHADOW: 0x000000,
    CONNECTION: 0xAAAAAA
};

export const WORLD = {
    SIZE: 4000,
    GRID_SIZE: 50,
    INTERACTION_RADIUS: 360,
    HIT_RADIUS: 40,
    
    // --- ESTÉTICA ORGÁNICA ---
    ZONE_RADIUS: 90,       // Grosor físico
    ZONE_BLUR: 60,         // MUCHO BLUR: Esto crea curvas muy suaves al recortar
    CLUSTER_DISTANCE: 450,
    // ZONE_LAYER_ALPHA: 1 // Ya no hace falta, el shader controla alpha
};

export const PLAYER = {
    SPEED: 9,
    ACCEL: 0.6,
    FRICTION: 0.90
};