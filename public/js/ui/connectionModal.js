import { api } from '../services/api.js';
import { objects } from '../entities/innovationObject.js';

// Callback para notificar a main.js
let onConnectionCreatedCallback = null;

export function setOnConnectionCreated(cb) {
    onConnectionCreatedCallback = cb;
}

const styles = `
    #conn-modal {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 25px; border-radius: 10px; width: 400px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3); z-index: 6000; display: none;
        font-family: 'Segoe UI', sans-serif;
    }
    #conn-modal.active { display: block; }
    .conn-header { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #333; }
    .conn-row { margin-bottom: 15px; }
    .conn-label { font-size: 12px; font-weight: 700; color: #666; margin-bottom: 5px; display: block; }
    .conn-val { font-size: 14px; padding: 8px; background: #f5f5f7; border-radius: 4px; color: #333; }
    .conn-select { width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-weight: 600; }
    .btn-cancel { background: #eee; color: #333; }
    .btn-save { background: #4A90E2; color: white; }
`;

let modalEl, overlayEl;
let sourceNode = null;
let targetNode = null;

export function initConnectionModal() {
    if (document.getElementById('conn-modal')) return;
    
    const s = document.createElement("style"); s.innerText = styles; document.head.appendChild(s);

    overlayEl = document.querySelector('.overlay-backdrop'); 
    if (!overlayEl) {
        overlayEl = document.createElement('div');
        overlayEl.className = 'overlay-backdrop';
        document.body.appendChild(overlayEl);
    }

    modalEl = document.createElement('div');
    modalEl.id = 'conn-modal';
    modalEl.innerHTML = `
        <div class="conn-header">Nueva Conexión</div>
        
        <div class="conn-row">
            <span class="conn-label">ORIGEN</span>
            <div id="conn-source-name" class="conn-val">...</div>
        </div>

        <div class="conn-row">
            <span class="conn-label">DESTINO (Categoría)</span>
            <select id="conn-cat-select" class="conn-select"></select>
        </div>

        <div class="conn-row">
            <span class="conn-label">DESTINO (Nodo)</span>
            <select id="conn-node-select" class="conn-select" disabled></select>
        </div>

        <div class="conn-row">
            <span class="conn-label">Descripción de la relación</span>
            <input type="text" id="conn-desc" class="form-control" placeholder="Ej: Inspira a..." autocomplete="off" style="width:100%; box-sizing:border-box; padding:8px;">
        </div>

        <div class="modal-actions">
            <button id="btn-conn-cancel" class="btn btn-cancel">Cancelar</button>
            <button id="btn-conn-save" class="btn btn-save">Conectar</button>
        </div>
    `;
    document.body.appendChild(modalEl);

    document.getElementById('btn-conn-cancel').onclick = closeConnectionModal;
    document.getElementById('btn-conn-save').onclick = saveConnection;
    
    document.getElementById('conn-cat-select').addEventListener('change', (e) => {
        populateNodeSelect(e.target.value);
    });
}

export async function openConnectionModal(sourceObj, targetObj = null) {
    sourceNode = sourceObj;
    targetNode = targetObj;
    
    document.getElementById('conn-source-name').innerText = sourceObj.dataRef.title;
    document.getElementById('conn-desc').value = "";

    const catSelect = document.getElementById('conn-cat-select');
    const nodeSelect = document.getElementById('conn-node-select');

    const cats = await api.getCategories();
    catSelect.innerHTML = '<option value="" disabled selected>Seleccionar Área...</option>' + 
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    if (targetObj) {
        catSelect.value = targetObj.dataRef.category_id; 
        catSelect.disabled = true;
        nodeSelect.innerHTML = `<option value="${targetObj.dataRef.id}" selected>${targetObj.dataRef.title}</option>`;
        nodeSelect.disabled = true;
    } else {
        catSelect.disabled = false;
        nodeSelect.innerHTML = '<option>Selecciona un Área primero</option>';
        nodeSelect.disabled = true;
    }

    overlayEl.classList.add('active');
    modalEl.classList.add('active');
}

function populateNodeSelect(catId) {
    const nodeSelect = document.getElementById('conn-node-select');
    nodeSelect.disabled = false;
    
    const availableNodes = objects.filter(o => 
        String(o.dataRef.category_id) === String(catId) && 
        o !== sourceNode 
    );

    if (availableNodes.length === 0) {
        nodeSelect.innerHTML = '<option disabled>No hay nodos aquí</option>';
        return;
    }

    nodeSelect.innerHTML = availableNodes.map(o => 
        `<option value="${o.dataRef.id}">${o.dataRef.title}</option>`
    ).join('');
}

export function closeConnectionModal() {
    modalEl.classList.remove('active');
    overlayEl.classList.remove('active');
    sourceNode = null;
    targetNode = null;
}

async function saveConnection() {
    const desc = document.getElementById('conn-desc').value;
    
    let targetId;
    if (targetNode) {
        targetId = targetNode.dataRef.id;
    } else {
        targetId = document.getElementById('conn-node-select').value;
    }

    if (!targetId) return alert("Selecciona un destino");

    try {
        const connData = {
            source_node_id: sourceNode.dataRef.id,
            target_node_id: targetId,
            description: desc
        };
        
        // 1. Guardar en DB
        const newConn = await api.createConnection(connData);
        
        // 2. Notificar a Main para que actualice gráficos y lista global
        if (onConnectionCreatedCallback) {
            onConnectionCreatedCallback(newConn, sourceNode, targetNode || objects.find(o => o.dataRef.id == targetId));
        }
        
        closeConnectionModal();
    } catch (e) {
        alert("Error: " + e.message);
    }
}