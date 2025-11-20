import { layers } from '../core/app.js';
import { COLORS, WORLD } from '../config/constants.js';
// Eliminamos la importación directa de openSidebar, ya que ahora lo gestiona main.js
// import { openSidebar } from '../ui/sidebar.js'; <--- BORRAR ESTA LÍNEA

export const objects = [];
let selectedObject = null; 

// Función auxiliar para dibujar formas geométricas (Sin cambios)
function drawShape(graphics, type, size, color) {
    graphics.clear();
    graphics.lineStyle(2, 0xFFFFFF, 1);
    graphics.beginFill(color);

    switch (type) {
        case 'square': 
            graphics.drawRect(-size, -size, size * 2, size * 2);
            break;
        case 'circle':
            graphics.drawCircle(0, 0, size);
            break;
        case 'triangle': 
            graphics.drawPolygon([-size, -size + 5, size, -size + 5, 0, size + 5]);
            break;
        case 'hexagon':
            const path = [];
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                path.push(Math.cos(angle) * size, Math.sin(angle) * size);
            }
            graphics.drawPolygon(path);
            break;
        case 'diamond':
        default:
            graphics.drawRect(-size, -size, size * 2, size * 2);
            break;
    }
    graphics.endFill();
}

export function createObject(data) {
    const container = new PIXI.Container();
    container.x = data.x;
    container.y = data.y;
    
    container.eventMode = 'static';
    container.cursor = 'pointer';
    container.hitArea = new PIXI.Circle(0, 0, WORLD.HIT_RADIUS);

    // Gráficos
    const connectionLine = new PIXI.Graphics();
    container.addChild(connectionLine);

    const shadow = new PIXI.Graphics();
    shadow.beginFill(COLORS.SHADOW, 0.1);
    shadow.drawEllipse(0, 0, 15, 8);
    shadow.endFill();
    shadow.y = 24;
    container.addChild(shadow);

    const shape = new PIXI.Graphics();
    container.addChild(shape);

    // Dibujar Forma
    const colorNum = parseInt(data.cat_color.replace('#', '0x'));
    const shapeType = data.type_shape || 'diamond'; 
    drawShape(shape, shapeType, 14, colorNum);

    if (shapeType === 'diamond') {
        shape.rotation = Math.PI / 4;
    }

    // Etiqueta
    const label = new PIXI.Text(data.title, {
        fontFamily: 'Segoe UI',
        fontSize: 14,
        fontWeight: 'bold',
        fill: COLORS.TEXT_DARK,
        align: 'center',
        stroke: 0xFFFFFF,
        strokeThickness: 3
    });
    label.anchor.set(0.5, 1);
    label.y = -30;
    label.alpha = 0; 
    container.addChild(label);

    // --- REFERENCIA LÓGICA (ACTUALIZADA) ---
    const objRef = { 
        container, shape, shadow, label, connectionLine,
        hoverTime: Math.random() * 10,
        selected: false,
        appearing: true,
        baseRotation: shape.rotation,
        colorRef: data.cat_color,
        catNameRef: data.cat_name,
        dataRef: data, // <--- IMPORTANTE: Guardamos los datos crudos aquí
        isHovered: false
    };

    objects.push(objRef);

    // --- EVENTOS (ACTUALIZADO PARA USAR EL SISTEMA CENTRAL) ---
    
    container.on('pointerdown', (e) => {
        e.stopPropagation(); // Evitar clic en suelo
        
        // Deseleccionar el anterior visualmente
        if (selectedObject && selectedObject !== objRef) {
            selectedObject.selected = false;
        }

        objRef.selected = true;
        selectedObject = objRef;
        
        // DELEGAMOS LA LÓGICA A MAIN.JS (Gestor de modos)
        // Si window.handleObjectClick existe (definido en main.js), lo usamos.
        if (window.handleObjectClick) {
            window.handleObjectClick(objRef, e);
        }
    });

    container.on('pointerover', () => { objRef.isHovered = true; });
    container.on('pointerout', () => { objRef.isHovered = false; });

    layers.objects.addChild(container);
}

export function updateObjects(delta, playerPos) {
    for (const obj of objects) {
        obj.hoverTime += 0.05 * delta;
        
        // Animación
        let floatAmp = 3;
        if (obj.selected) floatAmp = 6;
        else if (obj.isHovered) floatAmp = 4;

        const hoverY = Math.sin(obj.hoverTime * (obj.selected ? 3 : 1)) * floatAmp;
        obj.shape.y = hoverY;
        obj.shadow.scale.set(1 - (hoverY * 0.03));

        // Rotación
        if (obj.selected) {
            obj.shape.rotation += 0.05 * delta;
        } else if (obj.isHovered) {
            obj.shape.rotation = obj.baseRotation + Math.sin(obj.hoverTime * 5) * 0.1; 
        } else {
            obj.shape.rotation += (obj.baseRotation - obj.shape.rotation) * 0.1;
        }

        // Tint / Escala
        if (obj.selected) {
            obj.shape.tint = 0xFFFFFF; 
            obj.shape.scale.set(1.2); 
        } else if (obj.isHovered) {
            obj.shape.tint = 0xFFF0A0; 
            obj.shape.scale.set(1.1); 
        } else {
            obj.shape.tint = 0xFFFFFF; 
            if (!obj.appearing) obj.shape.scale.set(1); 
        }

        // Conexión visual al jugador (línea sólida de proximidad)
        const dx = playerPos.x - obj.container.x;
        const dy = playerPos.y - obj.container.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        obj.connectionLine.clear();

        if (dist < WORLD.INTERACTION_RADIUS) {
            obj.label.alpha += (1 - obj.label.alpha) * 0.1;
            const lineAlpha = Math.max(0, 1 - (dist / WORLD.INTERACTION_RADIUS));
            obj.connectionLine.lineStyle(1, COLORS.PRIMARY, lineAlpha);
            obj.connectionLine.moveTo(0, 0);
            obj.connectionLine.lineTo(dx, dy);
            obj.connectionLine.beginFill(COLORS.PRIMARY, lineAlpha);
            obj.connectionLine.drawCircle(0,0, 3);
            obj.connectionLine.endFill();
        } else {
            if (!obj.selected && !obj.isHovered) obj.label.alpha += (0 - obj.label.alpha) * 0.2;
            if (obj.isHovered) obj.label.alpha = 1; 
        }
        
        if (obj.appearing) {
            if (obj.shape.scale.x < 1) {
                obj.shape.scale.x += 0.1 * delta;
                obj.shape.scale.y += 0.1 * delta;
            } else {
                obj.appearing = false;
            }
        }
    }
}

export function deselectAllObjects() {
    if (selectedObject) {
        selectedObject.selected = false;
        selectedObject = null;
    }
}