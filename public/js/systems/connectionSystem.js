import { layers } from '../core/app.js';
import { objects } from '../entities/innovationObject.js';

const permanentContainer = new PIXI.Container();
const tempGraphics = new PIXI.Graphics();

layers.grid.addChild(permanentContainer); 
layers.trails.addChild(tempGraphics); 

// Almacén de conexiones visuales
// Estructura: { graphic, objA, objB, thickness, active, dashOffset, ids, count }
let visualConnections = new Map();

// Helper para dibujar línea discontinua con offset (animación)
function drawAnimatableDashedLine(graphics, p1, p2, thickness, color, offset = 0) {
    graphics.lineStyle(thickness, color, 1); 

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const dashLen = 12;
    const gapLen = 8;
    const cycle = dashLen + gapLen;

    // Iniciamos el dibujo desplazados por el offset (modulo ciclo)
    let currentDist = - (offset % cycle);
    if (currentDist > 0) currentDist -= cycle;

    while (currentDist < dist) {
        const start = Math.max(0, currentDist);
        const end = Math.min(dist, currentDist + dashLen);

        if (start < end) {
            graphics.moveTo(p1.x + cos * start, p1.y + sin * start);
            graphics.lineTo(p1.x + cos * end, p1.y + sin * end);
        }
        currentDist += cycle;
    }
}

// Helper simple para estática
function drawSimpleDashedLine(graphics, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const angle = Math.atan2(dy, dx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    let current = 0;
    while (current < dist) {
        graphics.moveTo(p1.x + cos * current, p1.y + sin * current);
        current += 12; 
        if (current >= dist) {
             graphics.lineTo(p1.x + cos * dist, p1.y + sin * dist);
        } else {
             graphics.lineTo(p1.x + cos * current, p1.y + sin * current);
        }
        current += 8; 
    }
}

// Cargar y Agrupar conexiones desde DB
export function loadConnections(connectionsData) {
    permanentContainer.removeChildren();
    visualConnections.clear();

    // Agrupar datos por pares de nodos
    const groups = new Map();

    connectionsData.forEach(conn => {
        const ids = [conn.source_node_id, conn.target_node_id].sort();
        const key = `${ids[0]}_${ids[1]}`;
        
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(conn);
    });

    // Crear gráficos
    groups.forEach((conns, key) => {
        const connData = conns[0];
        const objA = objects.find(o => o.dataRef.id === connData.source_node_id);
        const objB = objects.find(o => o.dataRef.id === connData.target_node_id);

        if (objA && objB) {
            const g = new PIXI.Graphics();
            permanentContainer.addChild(g);
            
            const count = conns.length;
            const thickness = Math.min(count, 5) * 1.5 + 1; 

            visualConnections.set(key, {
                graphic: g,
                objA: objA,
                objB: objB,
                count: count, // Guardamos cuántas hay
                thickness: thickness,
                active: false,
                dashOffset: 0,
                ids: [objA.dataRef.id, objB.dataRef.id]
            });
        }
    });

    updateVisuals();
}

// --- FUNCIÓN RESTAURADA Y ADAPTADA PARA EL MODAL ---
export function createPermanentConnection(objA, objB, desc) {
    const ids = [objA.dataRef.id, objB.dataRef.id].sort();
    const key = `${ids[0]}_${ids[1]}`;
    
    let vc = visualConnections.get(key);
    
    if (vc) {
        // Si ya existe conexión visual, aumentamos grosor
        vc.count++;
        vc.thickness = Math.min(vc.count, 5) * 1.5 + 1;
    } else {
        // Si es nueva, la creamos
        const g = new PIXI.Graphics();
        permanentContainer.addChild(g);
        
        vc = {
            graphic: g,
            objA: objA,
            objB: objB,
            count: 1,
            thickness: 2.5, // 1 * 1.5 + 1
            active: false, // Inicia inactiva (gris)
            dashOffset: 0,
            ids: ids
        };
        visualConnections.set(key, vc);
    }

    // Forzamos repintado inmediato
    updateVisuals();
}

// Loop de animación
export function updateConnections(delta) {
    visualConnections.forEach(vc => {
        if (vc.active) {
            vc.dashOffset += 1.5 * delta; 
        } else {
             vc.dashOffset = 0;
        }
    });
    updateVisuals();
}

function updateVisuals() {
    visualConnections.forEach(vc => {
        vc.graphic.clear();
        
        const color = vc.active ? 0xE04F5F : 0x666666;
        const alpha = vc.active ? 1 : 0.5;
        
        if (vc.active) {
            drawAnimatableDashedLine(
                vc.graphic, 
                {x: vc.objA.container.x, y: vc.objA.container.y}, 
                {x: vc.objB.container.x, y: vc.objB.container.y}, 
                vc.thickness, 
                color, 
                vc.dashOffset
            );
        } else {
            vc.graphic.lineStyle(vc.thickness, color, alpha);
            drawSimpleDashedLine(
                vc.graphic,
                {x: vc.objA.container.x, y: vc.objA.container.y}, 
                {x: vc.objB.container.x, y: vc.objB.container.y}
            );
        }
    });
}

export function highlightConnections(nodeId) {
    visualConnections.forEach(vc => {
        if (vc.ids.includes(nodeId)) {
            vc.active = true;
            permanentContainer.addChild(vc.graphic); // Traer al frente
        } else {
            vc.active = false;
        }
    });
}

export function resetHighlights() {
    visualConnections.forEach(vc => {
        vc.active = false;
    });
}

// Visual temporal (dragging)
export function updateTempConnection(sourceObj, playerPos) {
    tempGraphics.clear();
    if (!sourceObj) return;
    tempGraphics.lineStyle(2, 0x4A90E2, 1); 
    drawSimpleDashedLine(tempGraphics, {x: sourceObj.container.x, y: sourceObj.container.y}, playerPos);
    tempGraphics.beginFill(0x4A90E2);
    tempGraphics.drawCircle(playerPos.x, playerPos.y, 4);
    tempGraphics.endFill();
}

export function clearTempConnection() {
    tempGraphics.clear();
}