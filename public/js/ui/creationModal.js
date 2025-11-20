import { api } from '../services/api.js';
import { createObject } from '../entities/innovationObject.js';
import { updateZones } from '../systems/zoneSystem.js';

const styles = `
    #create-modal {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 30px; border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 480px; z-index: 5000;
        font-family: 'Segoe UI', sans-serif; display: none;
        border: 1px solid #eee; max-height: 90vh; overflow-y: auto;
    }
    #create-modal.active { display: block; }
    .modal-header { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px; }
    
    .form-section { display: flex; gap: 15px; margin-bottom: 15px; }
    .col { flex: 1; }

    .form-group { margin-bottom: 15px; }
    .form-label { display: block; font-size: 12px; font-weight: 700; color: #666; margin-bottom: 5px; text-transform: uppercase; }
    .form-control { width: 100%; padding: 10px; border: 2px solid #eee; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
    .form-control:focus { border-color: #4A90E2; outline: none; }
    
    /* Nueva Categoría */
    #new-cat-section {
        display: none; background: #F0F7FF; padding: 10px; border-radius: 6px; 
        border: 1px dashed #4A90E2; margin-top: 5px;
    }
    #new-cat-section.active { display: block; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn { padding: 10px 20px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; }
    .btn-cancel { background: #eee; color: #333; }
    .btn-save { background: #4A90E2; color: white; }
    
    .overlay-backdrop {
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(255,255,255,0.8); z-index: 4999; display: none;
    }
    .overlay-backdrop.active { display: block; }
`;

let modalElement, backdropElement;
let currentPos = { x: 0, y: 0 };
let isVisible = false;

export function initCreationModal() {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    backdropElement = document.createElement('div');
    backdropElement.className = 'overlay-backdrop';
    document.body.appendChild(backdropElement);

    modalElement = document.createElement('div');
    modalElement.id = 'create-modal';
    modalElement.innerHTML = `
        <div class="modal-header">Nueva Señal de Innovación</div>
        
        <div class="form-section">
            <!-- 1. TIPO DE SEÑAL (Forma) -->
            <div class="col">
                <label class="form-label">¿Qué es? (Tipo)</label>
                <select id="input-type" class="form-control">
                    <option disabled selected>Cargando...</option>
                </select>
            </div>
            
            <!-- 2. CATEGORÍA (Color) -->
            <div class="col">
                <label class="form-label">¿De qué Área?</label>
                <select id="input-cat" class="form-control">
                    <option disabled selected>Cargando...</option>
                </select>
            </div>
        </div>

        <!-- Formulario para crear nueva categoría -->
        <div id="new-cat-section">
            <div class="form-group">
                <label class="form-label">Nombre Nueva Área</label>
                <input type="text" id="new-cat-name" class="form-control" placeholder="Ej: Realidad Virtual">
            </div>
            <div class="form-group">
                <label class="form-label">Color del Área</label>
                <input type="color" id="new-cat-color" class="form-control" value="#4A90E2" style="height:40px; cursor:pointer;">
            </div>
        </div>

        <div class="form-group">
            <label class="form-label">Título</label>
            <input type="text" id="input-title" class="form-control" placeholder="Ej: Implementar Scrum en..." autocomplete="off">
        </div>

        <div class="form-group">
            <label class="form-label">Descripción</label>
            <textarea id="input-desc" class="form-control" placeholder="Detalles de la idea..."></textarea>
        </div>

        <div class="form-group">
            <label class="form-label">Enlace (Opcional)</label>
            <input type="url" id="input-link" class="form-control" placeholder="https://...">
        </div>

        <div class="modal-actions">
            <button id="btn-cancel-create" class="btn btn-cancel">Cancelar</button>
            <button id="btn-save-create" class="btn btn-save">Plantar</button>
        </div>
    `;
    document.body.appendChild(modalElement);

    // Listeners
    document.getElementById('btn-cancel-create').onclick = closeCreationModal;
    document.getElementById('btn-save-create').onclick = saveNode;
    
    // Listener para mostrar "Nueva Categoría"
    document.getElementById('input-cat').addEventListener('change', (e) => {
        const section = document.getElementById('new-cat-section');
        if (e.target.value === 'NEW') {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    loadFormData();
}

async function loadFormData() {
    try {
        // Cargar Tipos y Categorías en paralelo
        const [types, cats] = await Promise.all([
            api.getSignalTypes(),
            api.getCategories()
        ]);

        // Rellenar Tipos (Idea, Reto...)
        const selectType = document.getElementById('input-type');
        selectType.innerHTML = types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');

        // Rellenar Categorías (Informática, Electrónica...)
        const selectCat = document.getElementById('input-cat');
        let htmlCat = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        htmlCat += `<option value="NEW" style="font-weight:bold; color:#4A90E2;">+ Nueva Área...</option>`;
        selectCat.innerHTML = htmlCat;

    } catch (e) {
        console.error("Error cargando datos de formulario", e);
    }
}

export function openCreationModal(x, y) {
    currentPos = { x, y };
    isVisible = true;
    
    // Reset Inputs
    document.getElementById('input-title').value = "";
    document.getElementById('input-desc').value = "";
    document.getElementById('input-link').value = "";
    document.getElementById('new-cat-name').value = "";
    document.getElementById('new-cat-section').classList.remove('active');
    
    // Reset selects
    const selectCat = document.getElementById('input-cat');
    if (selectCat.options.length > 0) selectCat.selectedIndex = 0;

    modalElement.classList.add('active');
    backdropElement.classList.add('active');

    setTimeout(() => document.getElementById('input-title').focus(), 100);
}

export function closeCreationModal() {
    isVisible = false;
    modalElement.classList.remove('active');
    backdropElement.classList.remove('active');
}

export function isModalOpen() { return isVisible; }

async function saveNode() {
    const typeSelect = document.getElementById('input-type');
    const catSelect = document.getElementById('input-cat');
    const title = document.getElementById('input-title').value;
    const desc = document.getElementById('input-desc').value;
    const link = document.getElementById('input-link').value;

    if (!title) return alert("Pon un título por favor.");

    const payload = {
        x: currentPos.x, y: currentPos.y,
        title, description: desc, link,
        signal_type_id: typeSelect.value // Enviamos el ID del tipo seleccionado
    };

    // Gestionar nueva categoría
    if (catSelect.value === 'NEW') {
        const newName = document.getElementById('new-cat-name').value;
        if (!newName) return alert("Escribe nombre para el área nueva");
        
        payload.is_new_category = true;
        payload.new_category_data = {
            name: newName,
            color: document.getElementById('new-cat-color').value
        };
    } else {
        payload.category_id = catSelect.value;
    }

    try {
        const newNode = await api.createNode(payload);
        createObject(newNode);
        updateZones(); // <--- ACTUALIZAR ZONAS AL PLANTAR NUEVA IDEA
        
        if (payload.is_new_category) loadFormData(); // Recargar lista si creamos una nueva
        closeCreationModal();
    } catch (e) {
        alert("Error: " + e.message);
    }
    
}