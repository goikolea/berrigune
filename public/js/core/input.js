import { app, world } from './app.js';

export class InputManager {
    constructor() {
        this.keys = {};
        this.target = null; 
        this.onSpacePressed = null; 

        this._initListeners();
    }

    _initListeners() {
        // Teclado
        window.addEventListener('keydown', (e) => {
            // --- FIX: Ignorar teclas si estamos escribiendo en un formulario ---
            const tag = document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                return; 
            }
            // ------------------------------------------------------------------

            this.keys[e.code] = true;
            
            // Evitar scroll del navegador con espacio
            if (e.code === 'Space') e.preventDefault(); 

            if (e.code === 'Space' && this.onSpacePressed) {
                this.onSpacePressed();
            }
        });
        
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Ratón (Click en suelo)
        app.stage.on('pointerdown', (e) => {
            // Esta lógica la maneja main.js con más detalle ahora
            // pero mantenemos el target básico por si acaso
            const globalPos = e.global;
            this.target = {
                x: globalPos.x - world.x,
                y: globalPos.y - world.y
            };
            
            // El feedback visual ahora lo gestiona main.js
            // this._createClickFeedback(...); 
        });
    }

    getDirection() {
        let x = 0, y = 0;
        // Comprobamos también aquí por seguridad, aunque el listener ya filtra
        const tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return { x: 0, y: 0, usingKeys: false };

        if (this.keys['KeyW'] || this.keys['ArrowUp']) y = -1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) y = 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) x = -1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) x = 1;

        if (x !== 0 || y !== 0) {
            this.target = null;
            const len = Math.sqrt(x*x + y*y);
            if (len > 0) { x /= len; y /= len; }
        }

        return { x, y, usingKeys: (x !== 0 || y !== 0) };
    }

    _createClickFeedback(x, y) {
        // Placeholder, se inyecta desde main.js
    }
}

export const input = new InputManager();