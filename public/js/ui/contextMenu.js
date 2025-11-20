import { world } from '../core/app.js'; 

const styles = `
    #context-menu {
        position: absolute; pointer-events: auto; display: none;
        z-index: 4000; 
        transform: translate(-50%, -120%); 
        padding-bottom: 10px;
    }
    .ctx-btn {
        background: #fff; color: #333; border: 1px solid #ccc;
        width: 36px; height: 36px; border-radius: 50%; margin: 0 4px;
        font-size: 18px; cursor: pointer;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        display: inline-flex; align-items: center; justify-content: center;
        transition: transform 0.1s, background 0.2s;
        user-select: none; /* Importante para no seleccionar texto al arrastrar */
    }
    .ctx-btn:hover { transform: scale(1.15); background: #f0f0f0; z-index: 10; }
    .ctx-btn.move { color: #F5A623; border-color: #F5A623; } 
    .ctx-btn.conn { color: #4A90E2; border-color: #4A90E2; } 
`;

let menuEl, activeObj = null;

export function initContextMenu(onStartDrag, onConnect) {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    menuEl = document.createElement('div');
    menuEl.id = 'context-menu';
    menuEl.innerHTML = `
        <button class="ctx-btn move" id="btn-ctx-move" title="Mover (Mantener pulsado)">✋</button>
        <button class="ctx-btn conn" id="btn-ctx-conn" title="Conectar">🔗</button>
    `;
    document.body.appendChild(menuEl);

    // --- CAMBIO CLAVE: Mover usa POINTERDOWN (Click y mantener) ---
    const btnMove = document.getElementById('btn-ctx-move');
    btnMove.onpointerdown = (e) => {
        e.preventDefault(); // Evitar drag nativo del navegador
        e.stopPropagation();
        if (activeObj) {
            onStartDrag(activeObj); // Iniciamos arrastre inmediato
            hideContextMenu();      // Ocultamos menú
        }
    };

    // Conectar sigue siendo onclick normal
    document.getElementById('btn-ctx-conn').onclick = () => {
        if (activeObj) onConnect(activeObj);
        hideContextMenu();
    };
}

export function showContextMenu(objRef) {
    activeObj = objRef;
    menuEl.style.display = 'block';
    updateMenuPos();
}

export function hideContextMenu() {
    menuEl.style.display = 'none';
    activeObj = null;
}

export function updateMenuPos() {
    if (!activeObj || menuEl.style.display === 'none') return;
    const screenX = activeObj.container.x + world.x;
    const screenY = activeObj.container.y + world.y;
    menuEl.style.left = screenX + 'px';
    menuEl.style.top = (screenY - 30) + 'px'; 
}