import { app, world } from './app.js';

export class InputManager {
    constructor() {
        this.keys = {};
        this.target = null; // Destino click-to-move
        this.onSpacePressed = null; // Callback

        this._initListeners();
    }

    _initListeners() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.onSpacePressed) {
                this.onSpacePressed();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Ratón (Click en suelo)
        app.stage.on('pointerdown', (e) => {
            const globalPos = e.global;
            // Calculamos posición en el mundo relativo
            this.target = {
                x: globalPos.x - world.x,
                y: globalPos.y - world.y
            };
            
            // Disparar evento visual (feedback)
            this._createClickFeedback(this.target.x, this.target.y);
        });
    }

    // Calcula el vector de dirección basado en teclas
    getDirection() {
        let x = 0, y = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) y = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) y = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x = 1;

        // Si hay input de teclado, anulamos el click-to-move
        if (x !== 0 || y !== 0) {
            this.target = null;
            // Normalizar vector
            const len = Math.sqrt(x*x + y*y);
            if (len > 0) { x /= len; y /= len; }
        }

        return { x, y, usingKeys: (x !== 0 || y !== 0) };
    }

    // Efecto visual simple al hacer click
    _createClickFeedback(x, y) {
        const { layers } = require('./app.js'); // Import dinámico para evitar ciclos
        // Nota: En ES modules puros esto se maneja pasando layers al constructor, 
        // pero para simplificar este ejemplo usaremos una lógica simple o lo omitimos aquí.
        // (Implementaremos el feedback visual en main.js para mantener input.js puro)
    }
}

export const input = new InputManager();