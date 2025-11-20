import { app, layers, world } from './core/app.js';
import { input } from './core/input.js';
import { updateCamera } from './core/camera.js';
import { createGrid } from './entities/environment.js';
import { initPlayer, updatePlayer, getPlayerPos, teleportPlayer} from './entities/player.js'; // <--- Importar updatePlayerBadges
import { createObject, updateObjects, deselectAllObjects } from './entities/innovationObject.js';
import { updateParticles } from './systems/particles.js';
import { updateZones } from './systems/zoneSystem.js';
import { initLogin } from './ui/loginModal.js';
import { api } from './services/api.js';

import { initSidebar } from './ui/sidebar.js';
import { initCreationModal, openCreationModal, isModalOpen, setOnNodeCreated } from './ui/creationModal.js';
import { initContextMenu, showContextMenu, hideContextMenu, updateMenuPos } from './ui/contextMenu.js';
import { initConnectionModal, openConnectionModal, setOnConnectionCreated } from './ui/connectionModal.js';
import { loadConnections, updateTempConnection, clearTempConnection, highlightConnections, resetHighlights, updateConnections, createPermanentConnection } from './systems/connectionSystem.js';
import { initMinimap, updateMinimap } from './ui/minimap.js';
import { initSearchList, renderList } from './ui/searchList.js';
import { initUserProfile, updateProfileData } from './ui/userProfile.js';
import { initChallengeNotification } from './ui/challengeNotification.js'; 
import { initAdminPanel } from './ui/adminPanel.js';

console.log("Campus Innovación: Main cargado.");

const GAME_MODE = { NORMAL: 'normal', CONNECTING: 'connecting', DRAGGING: 'dragging' };
const SCROLL_MARGIN = 100; 
const SCROLL_SPEED = 15;   

let currentMode = GAME_MODE.NORMAL;
let activeObject = null; 
let globalConnectionsData = []; 
let globalNodesData = []; 
let dragCameraTarget = { x: 0, y: 0 };
let lastClickTime = 0;

// --- FUNCIÓN DE GAMIFICACIÓN (FALTABA ESTO) ---
async function refreshGamification() {
    try {
        // Obtenemos stats para actualizar badges del jugador (visuales)
        // Nota: userProfile.js ya hace su propia llamada al abrirse, 
        // esto es para efectos en tiempo real en el canvas (si los hubiera)
        const status = await api.getGamificationStatus(); // Asegúrate de tener este endpoint o usar getUserStats si simplificamos
        // Si no implementamos badges visuales complejos en el avatar, esta parte es opcional,
        // pero es buena práctica mantener el estado sincronizado.
    } catch (e) { 
        // Silencioso para no spammear consola
    }
}

async function startGame() {
    console.log("Iniciando entorno 3D...");
    createGrid();
    initPlayer();
    initSidebar();
    initCreationModal();
    initConnectionModal();
    initMinimap();
    initSearchList([]);
    initUserProfile();
    initChallengeNotification();

    initContextMenu((obj) => startDragMode(obj), (obj) => startConnectMode(obj));

    setOnConnectionCreated((newConn, sourceObj, targetObj) => {
        globalConnectionsData.push(newConn);
        createPermanentConnection(sourceObj, targetObj, newConn.description);
        highlightConnections(sourceObj.dataRef.id);
        import('./ui/sidebar.js').then(m => m.updateConnectionList(globalConnectionsData));
        updateProfileData();
    });

    setOnNodeCreated((newNode) => {
        globalNodesData.push(newNode);
        renderList(globalNodesData);
        updateProfileData();
    });

    try {
        const nodes = await api.getNodes();
        if (nodes) {
            globalNodesData = nodes; 
            nodes.forEach(nodeData => createObject(nodeData));
            updateZones();
            renderList(globalNodesData);
        }
        await reloadData(); 
    } catch(e) { console.error(e); }

    // --- GAMIFICACIÓN: Loop (FALTABA ESTO) ---
    // setInterval(refreshGamification, 30000); // Cada 30s (Opcional si queremos badges en tiempo real en el avatar)

    setupGameLoop();
}

function setupGameLoop() {
    window.handleObjectClick = (objRef, event) => {
        if (isModalOpen()) return;
        if (currentMode === GAME_MODE.DRAGGING) return; 

        if (currentMode === GAME_MODE.NORMAL) {
            // --- REGISTRAR VISITA (FALTABA ESTO) ---
            api.registerVisit(objRef.dataRef.id).catch(e => console.error(e));

            showContextMenu(objRef);
            highlightConnections(objRef.dataRef.id);
            import('./ui/sidebar.js').then(m => m.openSidebar(objRef, globalConnectionsData, () => reloadData(), () => { deselectAllObjects(); resetHighlights(); }));
        } else if (currentMode === GAME_MODE.CONNECTING) {
            if (objRef === activeObject) { alert("Mismo nodo"); return; }
            openConnectionModal(activeObject, objRef);
            resetMode();
        }
    };

    input.onSpacePressed = () => {
        if (isModalOpen() || document.activeElement.tagName === 'INPUT') return; 
        if (currentMode === GAME_MODE.NORMAL) {
            const pos = getPlayerPos();
            openCreationModal(pos.x, pos.y);
        }
    };

    window.addEventListener('pointerup', () => {
        if (currentMode === GAME_MODE.DRAGGING && activeObject) finishDrag(activeObject);
    });

    app.ticker.add((delta) => {
        if (isModalOpen()) return;

        updatePlayer(delta, input);
        const playerPos = getPlayerPos();
        updateObjects(delta, playerPos);
        updateParticles(delta);

        let targetX, targetY;

        if (currentMode === GAME_MODE.DRAGGING) {
            const mouseScreen = app.renderer.events.pointer.global;
            const screenW = app.screen.width;
            const screenH = app.screen.height;

            if (mouseScreen.x < SCROLL_MARGIN) dragCameraTarget.x -= SCROLL_SPEED;
            else if (mouseScreen.x > screenW - SCROLL_MARGIN) dragCameraTarget.x += SCROLL_SPEED;
            if (mouseScreen.y < SCROLL_MARGIN) dragCameraTarget.y -= SCROLL_SPEED;
            else if (mouseScreen.y > screenH - SCROLL_MARGIN) dragCameraTarget.y += SCROLL_SPEED;

            targetX = dragCameraTarget.x;
            targetY = dragCameraTarget.y;
        } else {
            targetX = playerPos.x;
            targetY = playerPos.y;
        }

        updateCamera(targetX, targetY);
        updateMenuPos();
        updateMinimap();
        updateConnections(delta);

        if (currentMode === GAME_MODE.DRAGGING && activeObject) {
            const mouseGlobal = app.renderer.events.pointer.global;
            activeObject.container.x = mouseGlobal.x - world.x;
            activeObject.container.y = mouseGlobal.y - world.y;
            activeObject.container.alpha = 0.8;
            activeObject.container.scale.set(1.1);
        }

        if (currentMode === GAME_MODE.CONNECTING && activeObject) updateTempConnection(activeObject, playerPos);
        if (currentMode === GAME_MODE.MOVING && activeObject) {
             activeObject.container.x += (playerPos.x - activeObject.container.x) * 0.2;
             activeObject.container.y += (playerPos.y - 40 - activeObject.container.y) * 0.2;
        }
    });

    app.stage.on('pointerdown', (e) => {
        if (e.target !== app.stage) return; 
        if (isModalOpen()) return;
        
        const now = Date.now();
        // Doble clic ajustado a 250ms
        if (now - lastClickTime < 250 && currentMode === GAME_MODE.NORMAL) {
            const globalPos = e.global;
            openCreationModal(globalPos.x - world.x, globalPos.y - world.y);
            deselectAllObjects();
            resetHighlights();
            return;
        }
        lastClickTime = now;

        if (currentMode !== GAME_MODE.DRAGGING) {
            hideContextMenu(); 
            if (currentMode !== GAME_MODE.CONNECTING) {
                input._createClickFeedback(e.global.x - world.x, e.global.y - world.y);
                deselectAllObjects();
                resetHighlights(); 
            }
        }
    });
}

// --- FUNCIONES AUXILIARES ---
async function reloadData() {
    try {
        const conns = await api.getConnections();
        if (conns) {
            globalConnectionsData = conns;
            loadConnections(conns);
            import('./ui/sidebar.js').then(m => m.updateConnectionList(globalConnectionsData));
        }
    } catch (e) { console.error(e); }
}

function startConnectMode(obj) {
    currentMode = GAME_MODE.CONNECTING;
    activeObject = obj;
    deselectAllObjects(); 
    resetHighlights();
}

function startDragMode(obj) {
    const playerPos = getPlayerPos();
    dragCameraTarget.x = playerPos.x;
    dragCameraTarget.y = playerPos.y;
    currentMode = GAME_MODE.DRAGGING;
    activeObject = obj;
    deselectAllObjects(); 
    obj.container.eventMode = 'none';
}

async function finishDrag(obj) {
    obj.container.alpha = 1;
    obj.container.scale.set(1);
    obj.container.eventMode = 'static'; 
    try {
        await api.updateNodePosition(obj.dataRef.id, obj.container.x, obj.container.y);
        updateZones(); 
    } catch (e) { console.error(e); alert("Error al mover"); }
    resetMode();
}

function resetMode() {
    currentMode = GAME_MODE.NORMAL;
    activeObject = null;
    clearTempConnection();
}

// --- PUNTO DE ENTRADA PRINCIPAL ---
initLogin((user) => {
    console.log("Login exitoso. Rol:", user.role);
    if (user.role === 'admin') {
        initAdminPanel(true); 
    } else {
        startGame();
    }
});