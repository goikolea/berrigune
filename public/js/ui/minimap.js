import { objects } from '../entities/innovationObject.js';
import { getPlayerPos } from '../entities/player.js';
import { world, app } from '../core/app.js';
import { WORLD } from '../config/constants.js';

const MAP_SIZE = 200; // Tamaño en píxeles del minimapa
const SCALE = MAP_SIZE / WORLD.SIZE; // Factor de escala (ej: 200/4000 = 0.05)

const styles = `
    #minimap-container {
        position: absolute; 
        bottom: 20px; 
        left: 20px;
        width: ${MAP_SIZE}px; 
        height: ${MAP_SIZE}px;
        background: rgba(255, 255, 255, 0.25); /* Blanco semitransparente */
        backdrop-filter: blur(8px); /* Efecto cristal */
        border-radius: 16px; /* Bordes suaves */
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        border: 1px solid rgba(0,0,0,0.05);
        pointer-events: none; /* NO INTERACTIVO: Los clics lo atraviesan */
        z-index: 9000;
        overflow: hidden;
    }
    #minimap-canvas {
        width: 100%;
        height: 100%;
        display: block;
    }
`;

let canvas, ctx;

export function initMinimap() {
    if (document.getElementById('minimap-container')) return;

    // 1. Inyectar Estilos
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // 2. Crear Contenedor y Canvas
    const container = document.createElement('div');
    container.id = 'minimap-container';
    
    canvas = document.createElement('canvas');
    canvas.id = 'minimap-canvas';
    canvas.width = MAP_SIZE;
    canvas.height = MAP_SIZE;
    
    container.appendChild(canvas);
    document.body.appendChild(container);
    
    ctx = canvas.getContext('2d');
}

export function updateMinimap() {
    if (!ctx) return;

    // 1. Limpiar
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);

    // 2. Dibujar Nodos (Puntos de color)
    // Iteramos sobre los objetos del juego
    objects.forEach(obj => {
        // Convertir posición Mundo -> Minimapa
        const mx = obj.container.x * SCALE;
        const my = obj.container.y * SCALE;
        
        // Color desde la categoría (hex string a estilo canvas)
        ctx.fillStyle = obj.colorRef || '#999';
        
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2); // Radio 2.5px
        ctx.fill();
    });

    // 3. Dibujar Jugador (Punto Negro destacado)
    const playerPos = getPlayerPos();
    const px = playerPos.x * SCALE;
    const py = playerPos.y * SCALE;

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Pequeño borde blanco para que destaque si está sobre un nodo
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Dibujar Viewport (Cámara) - Rectángulo fino
    // La posición del mundo en Pixi es negativa respecto a la cámara (world.x = -cameraX)
    const camX = -world.x * SCALE;
    const camY = -world.y * SCALE;
    const camW = (app.screen.width / app.stage.scale.x) * SCALE; // Ajustar por si hubiera zoom global
    const camH = (app.screen.height / app.stage.scale.y) * SCALE;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(camX, camY, camW, camH);
}