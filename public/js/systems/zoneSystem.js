import { layers } from '../core/app.js';
import { objects } from '../entities/innovationObject.js';
import { WORLD } from '../config/constants.js';
import { MetaballFilter } from '../core/filters.js';

const zoneGraphics = new Map(); // Map<ColorHex, PIXI.Container>

// Pool de etiquetas: Map<ColorHex, Array<PIXI.Text>>
// Guardamos las etiquetas creadas para reutilizarlas y no crear nuevas en cada frame
const labelPool = new Map(); 

function distToSegment(p, v, w) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt((p.x - projX)**2 + (p.y - projY)**2);
}

function darkenColor(colorNum, percent) {
    const r = (colorNum >> 16) & 0xFF;
    const g = (colorNum >> 8) & 0xFF;
    const b = colorNum & 0xFF;
    const newR = Math.max(0, r * (1 - percent));
    const newG = Math.max(0, g * (1 - percent));
    const newB = Math.max(0, b * (1 - percent));
    return (newR << 16) | (newG << 8) | newB;
}

// Función para obtener/crear una etiqueta del pool
function getLabel(color, index, catName) {
    if (!labelPool.has(color)) {
        labelPool.set(color, []);
    }
    
    const pool = labelPool.get(color);
    
    // Si no existe etiqueta en este índice, creamos una nueva
    if (!pool[index]) {
        const colorNum = parseInt(color.replace('#', '0x'));
        const darkColor = darkenColor(colorNum, 0.4); // Texto oscuro

        const label = new PIXI.Text("", {
            fontFamily: 'Segoe UI',
            fontSize: 40,
            fontWeight: '900',
            fill: darkColor,
            align: 'center',
            letterSpacing: 2,
            alpha: 0.15 // Marca de agua sutil
        });
        label.anchor.set(0.5);
        label.alpha = 0.25;
        
        // Añadimos la etiqueta DIRECTAMENTE a la capa (sobre las manchas, sin blur)
        layers.zones.addChild(label);
        pool.push(label);
    }

    const label = pool[index];
    label.text = catName.toUpperCase();
    label.visible = true;
    return label;
}

// --- FUNCIÓN PRINCIPAL ---
export function updateZones() {
    // 1. Limpiar gráficos (las formas se redibujan, los contenedores se mantienen)
    zoneGraphics.forEach(container => {
        container.graphicsRef.clear();
    });
    
    // Ocultar todas las etiquetas del pool (las activaremos según se necesiten)
    labelPool.forEach(labels => labels.forEach(l => l.visible = false));
    
    // Mapa para contar cuántas etiquetas de cada color hemos usado en este frame
    const labelUsageCount = new Map(); 

    // Estructuras para el grafo
    const adjacencyList = new Map(); // Mapa <Objeto, Array<Vecinos>>
    // Inicializar lista
    objects.forEach(obj => adjacencyList.set(obj, []));
    // Array para guardar las conexiones válidas y dibujarlas luego
    const validConnections = []; 

    // 2. CONSTRUIR EL GRAFO DE CONEXIONES (Detectar quién toca a quién)
    for (let i = 0; i < objects.length; i++) {
        const objA = objects[i];
        if (!objA.colorRef) continue;

        for (let j = i + 1; j < objects.length; j++) {
            const objB = objects[j];
            if (!objB.colorRef) continue;
            
            // Solo conectar mismo color
            if (objA.colorRef !== objB.colorRef) continue;

            const dist = Math.sqrt((objA.container.x - objB.container.x)**2 + (objA.container.y - objB.container.y)**2);

            if (dist < WORLD.CLUSTER_DISTANCE) {
                // Raycast de intrusos
                let blocked = false;
                for (const obstacle of objects) {
                    // Ignorar implicados y amigos
                    if (obstacle === objA || obstacle === objB) continue;
                    if (obstacle.colorRef === objA.colorRef) continue; 

                    const d = distToSegment(
                        { x: obstacle.container.x, y: obstacle.container.y },
                        { x: objA.container.x, y: objA.container.y },
                        { x: objB.container.x, y: objB.container.y }
                    );
                    
                    // Margen de seguridad (radio de zona)
                    if (d < WORLD.ZONE_RADIUS * 0.8) { blocked = true; break; }
                }

                if (!blocked) {
                    // Conexión válida: son vecinos
                    adjacencyList.get(objA).push(objB);
                    adjacencyList.get(objB).push(objA);
                    
                    // Guardamos la conexión para dibujar la "carretera"
                    validConnections.push({ a: objA, b: objB, color: objA.colorRef });
                }
            }
        }
    }

    // 3. ENCONTRAR ISLAS (Clusters)
    // Usamos BFS (Anchura) para agrupar nodos conectados
    const visited = new Set();
    const clusters = []; // Array de Arrays de objetos [ [obj1, obj2], [obj3, obj4, obj5] ]

    objects.forEach(startNode => {
        if (visited.has(startNode) || !startNode.colorRef) return;

        const cluster = [];
        const queue = [startNode];
        visited.add(startNode);

        while (queue.length > 0) {
            const node = queue.pop();
            cluster.push(node);

            const neighbors = adjacencyList.get(node);
            if (neighbors) {
                neighbors.forEach(neighbor => {
                    if (!visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                });
            }
        }

        // CRÍTICO: Solo procesamos islas con 2 o más elementos.
        // Los solitarios se ignoran.
        if (cluster.length > 1) {
            clusters.push(cluster);
        }
    });

    // 4. DIBUJAR CADA ISLA
    clusters.forEach(cluster => {
        const color = cluster[0].colorRef;
        const catName = cluster[0].catNameRef || "ZONA";

        // A. Preparar Gráficos (IGUAL)
        let container = zoneGraphics.get(color);
        if (!container) {
            container = new PIXI.Container();
            const graphics = new PIXI.Graphics();
            container.addChild(graphics);
            container.graphicsRef = graphics;

            const blur = new PIXI.BlurFilter(WORLD.ZONE_BLUR);
            blur.quality = 3; blur.repeatEdgePixels = true;
            const colorNum = parseInt(color.replace('#', '0x'));
            const metaball = new MetaballFilter(colorNum); 
            
            container.filters = [blur, metaball];
            layers.zones.addChild(container);
            zoneGraphics.set(color, container);
        }

        const g = container.graphicsRef;

        // B. Dibujar Forma (IGUAL)
        const drawThickness = WORLD.ZONE_RADIUS * 2; 
        g.lineStyle(drawThickness, 0xFFFFFF);
        g.lineCap = PIXI.LINE_CAP.ROUND;
        g.lineJoin = PIXI.LINE_JOIN.ROUND;

        // Conexiones (IGUAL)
        validConnections.forEach(conn => {
            if (cluster.includes(conn.a) && cluster.includes(conn.b)) {
                g.moveTo(conn.a.container.x, conn.a.container.y);
                g.lineTo(conn.b.container.x, conn.b.container.y);
            }
        });

        // Círculos (IGUAL)
        g.lineStyle(0);
        g.beginFill(0xFFFFFF);
        cluster.forEach(node => {
            g.drawCircle(node.container.x, node.container.y, WORLD.ZONE_RADIUS);
        });
        g.endFill();

        // --- C. ETIQUETA DINÁMICA (AQUÍ ESTÁ EL CAMBIO) ---
        
        let sumX = 0, sumY = 0;
        cluster.forEach(n => { sumX += n.container.x; sumY += n.container.y; });
        
        const currentCount = labelUsageCount.get(color) || 0;
        const label = getLabel(color, currentCount, catName);
        
        // 1. Calcular Posición
        label.x = sumX / cluster.length;
        label.y = sumY / cluster.length;
        
        // 2. Calcular Tamaño Dinámico
        // Lógica:
        // 2 elementos -> 25px
        // 3 elementos -> 30px
        // 4 elementos -> 35px
        // 5+ elementos -> 40px (Máximo)
        
        const minSize = 25;
        const maxSize = 40;
        const step = 5; // Cuánto crece por cada elemento extra
        
        // Fórmula: Base + (Extras * Paso), limitado a Max
        let dynamicSize = minSize + ((cluster.length - 2) * step);
        if (dynamicSize > maxSize) dynamicSize = maxSize;
        
        // Aplicar el tamaño al estilo del texto
        label.style.fontSize = dynamicSize;

        // Incrementar contador
        labelUsageCount.set(color, currentCount + 1);
    });
}