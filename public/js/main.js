import { app, layers } from './core/app.js';
import { input } from './core/input.js';
import { updateCamera } from './core/camera.js';
import { createGrid } from './entities/environment.js';
import { initPlayer, updatePlayer, getPlayerPos } from './entities/player.js';
import { createObject, updateObjects, deselectAllObjects } from './entities/innovationObject.js';
import { updateParticles } from './systems/particles.js';
import { updateZones } from './systems/zoneSystem.js'; // <--- IMPORTAR
import { initSidebar } from './ui/sidebar.js';
import { COLORS } from './config/constants.js';
import { initLogin } from './ui/loginModal.js';
import { initCreationModal, openCreationModal, isModalOpen } from './ui/creationModal.js';
import { api } from './services/api.js';

console.log("Campus Innovación: Main cargado.");

async function startGame() {
    console.log("Iniciando motor del juego...");

    createGrid();
    initPlayer();
    initSidebar();
    initCreationModal();

    // Cargar datos
    try {
        const nodes = await api.getNodes();
        if (nodes) {
            nodes.forEach(nodeData => createObject(nodeData));
            updateZones(); // <--- DIBUJAR ZONAS AL CARGAR
            console.log(`Cargados ${nodes.length} elementos.`);
        }
    } catch (e) {
        console.error("Error cargando nodos:", e);
    }

    // Inputs
    input.onSpacePressed = () => {
        if (!isModalOpen()) {
            const pos = getPlayerPos();
            openCreationModal(pos.x, pos.y);
        }
    };

    // Loop
    app.ticker.add((delta) => {
        if (isModalOpen()) return;

        updatePlayer(delta, input);
        const playerPos = getPlayerPos();
        updateObjects(delta, playerPos);
        updateParticles(delta);
        updateCamera(playerPos.x, playerPos.y);
        
        // Nota: No ponemos updateZones() aquí porque es costoso (filtros) 
        // y las zonas son estáticas. Solo se actualizan al crear/cargar.
    });

    // Click feedback
    const _originalClickFeedback = input._createClickFeedback;
    input._createClickFeedback = (x, y) => {
        if (isModalOpen()) return;
        deselectAllObjects();
        
        const ring = new PIXI.Graphics();
        ring.lineStyle(2, COLORS.PRIMARY, 0.5);
        ring.drawCircle(0, 0, 10);
        ring.x = x; ring.y = y;
        layers.grid.addChild(ring); 
        
        let scale = 1, alpha = 1;
        const ticker = (delta) => {
            scale += 0.1;
            alpha -= 0.08;
            ring.scale.set(scale);
            ring.alpha = alpha;
            if(alpha <= 0) { ring.destroy(); app.ticker.remove(ticker); }
        };
        app.ticker.add(ticker);
    };
}

initLogin(() => {
    startGame();
});