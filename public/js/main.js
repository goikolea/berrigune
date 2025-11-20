import { app, layers, world } from './core/app.js';
import { input } from './core/input.js';
import { updateCamera } from './core/camera.js';
import { createGrid } from './entities/environment.js';
import { initPlayer, updatePlayer, getPlayerPos, teleportPlayer } from './entities/player.js';
import { createObject, updateObjects, deselectAllObjects } from './entities/innovationObject.js';
import { updateParticles } from './systems/particles.js';
import { updateZones } from './systems/zoneSystem.js';
import { initLogin } from './ui/loginModal.js';
import { api } from './services/api.js';

import { initSidebar } from './ui/sidebar.js';
// Importamos setOnNodeCreated
import { initCreationModal, openCreationModal, isModalOpen, setOnNodeCreated } from './ui/creationModal.js';
import { initContextMenu, showContextMenu, hideContextMenu, updateMenuPos } from './ui/contextMenu.js';
import { initConnectionModal, openConnectionModal, setOnConnectionCreated } from './ui/connectionModal.js';
import { loadConnections, updateTempConnection, clearTempConnection, highlightConnections, resetHighlights, updateConnections, createPermanentConnection } from './systems/connectionSystem.js';
import { initMinimap, updateMinimap } from './ui/minimap.js';
import { initSearchList, renderList } from './ui/searchList.js';
import { initUserProfile } from './ui/userProfile.js'
import { initChallengeNotification } from './ui/challengeNotification.js';

console.log("Campus Innovación: Main cargado.");

const GAME_MODE = { 
    NORMAL: 'normal', 
    CONNECTING: 'connecting', 
    DRAGGING: 'dragging' 
};

const SCROLL_MARGIN = 100; 
const SCROLL_SPEED = 15;   

let currentMode = GAME_MODE.NORMAL;
let activeObject = null; 
let globalConnectionsData = []; 
let globalNodesData = []; 
let dragCameraTarget = { x: 0, y: 0 };
let lastClickTime = 0;

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

async function startGame() {
    createGrid();
    initPlayer();
    initSidebar();
    initCreationModal();
    initConnectionModal();
    initMinimap();
    initSearchList([]);
    initUserProfile();
    initChallengeNotification();

    initContextMenu(
        (obj) => startDragMode(obj), 
        (obj) => startConnectMode(obj)
    );

    // Callback: Nueva Conexión
    setOnConnectionCreated((newConn, sourceObj, targetObj) => {
        globalConnectionsData.push(newConn);
        createPermanentConnection(sourceObj, targetObj, newConn.description);
        highlightConnections(sourceObj.dataRef.id);
        import('./ui/sidebar.js').then(m => m.updateConnectionList(globalConnectionsData));
    });

    // --- NUEVO: Callback Nuevo Nodo ---
    setOnNodeCreated((newNode) => {
        // 1. Añadir a la lista global
        globalNodesData.push(newNode);
        
        // 2. Actualizar Directorio/Buscador
        renderList(globalNodesData);
        
        // (Opcional) Forzar actualización del minimapa si fuera necesario
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

    window.handleObjectClick = (objRef, event) => {
        if (isModalOpen()) return;
        if (currentMode === GAME_MODE.DRAGGING) return; 

        if (currentMode === GAME_MODE.NORMAL) {
            showContextMenu(objRef);
            highlightConnections(objRef.dataRef.id);

            import('./ui/sidebar.js').then(m => {
                m.openSidebar(
                    objRef, 
                    globalConnectionsData, 
                    () => reloadData(),
                    () => {
                        deselectAllObjects();
                        resetHighlights();
                    }
                );
            });

        } else if (currentMode === GAME_MODE.CONNECTING) {
            if (objRef === activeObject) { alert("Mismo nodo"); return; }
            openConnectionModal(activeObject, objRef);
            resetMode();
        }
    };

    input.onSpacePressed = () => {
        if (isModalOpen()) return;
        if (document.activeElement.tagName === 'INPUT') return; 

        if (currentMode === GAME_MODE.NORMAL) {
            const pos = getPlayerPos();
            openCreationModal(pos.x, pos.y);
        }
    };

    window.addEventListener('pointerup', () => {
        if (currentMode === GAME_MODE.DRAGGING && activeObject) {
            finishDrag(activeObject);
        }
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

        if (currentMode === GAME_MODE.DRAGGING && activeObject) {
            const mouseGlobal = app.renderer.events.pointer.global;
            activeObject.container.x = mouseGlobal.x - world.x;
            activeObject.container.y = mouseGlobal.y - world.y;
            activeObject.container.alpha = 0.8;
            activeObject.container.scale.set(1.1);
        }

        updateConnections(delta);

        if (currentMode === GAME_MODE.CONNECTING && activeObject) {
            updateTempConnection(activeObject, playerPos);
        }
        
        if (currentMode === GAME_MODE.MOVING && activeObject) {
            activeObject.container.x += (playerPos.x - activeObject.container.x) * 0.2;
            activeObject.container.y += (playerPos.y - 40 - activeObject.container.y) * 0.2;
        }
    });

    app.stage.on('pointerdown', (e) => {
        if (e.target !== app.stage) return; 
        if (isModalOpen()) return;
        
        const now = Date.now();
        if (now - lastClickTime < 300 && currentMode === GAME_MODE.NORMAL) {
            const globalPos = e.global;
            const worldX = globalPos.x - world.x;
            const worldY = globalPos.y - world.y;
            openCreationModal(worldX, worldY);
            deselectAllObjects();
            resetHighlights();
            return;
        }
        lastClickTime = now;

        if (currentMode !== GAME_MODE.DRAGGING) {
            hideContextMenu(); 
            if (currentMode === GAME_MODE.CONNECTING) {
            } else {
                input._createClickFeedback(e.global.x - world.x, e.global.y - world.y);
                deselectAllObjects();
                resetHighlights(); 
            }
        }
    });
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
    const x = obj.container.x;
    const y = obj.container.y;
    try {
        await api.updateNodePosition(obj.dataRef.id, x, y);
        updateZones(); 
    } catch (e) {
        console.error(e);
        alert("Error al mover (posiblemente no eres el dueño)");
    }
    resetMode();
}

function resetMode() {
    currentMode = GAME_MODE.NORMAL;
    activeObject = null;
    clearTempConnection();
}

initLogin(() => startGame());