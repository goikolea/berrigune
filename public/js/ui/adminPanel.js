import { api } from '../services/api.js';

// Variable para almacenar los datos actuales y no tener que pedirlos de nuevo al editar
let currentAdminData = { nodes: [], connections: [] };
let editingType = null; // 'node' o 'connection'
let editingId = null;

const styles = `
    #admin-dashboard {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #f4f4f9; z-index: 10000;
        display: none; flex-direction: column;
        font-family: 'Segoe UI', sans-serif;
    }
    #admin-dashboard.active { display: flex; }
    
    .admin-header {
        background: #2c3e50; color: white; padding: 15px 30px;
        display: flex; justify-content: space-between; align-items: center;
    }
    .admin-title { font-size: 20px; font-weight: bold; }
    .btn-close-admin { background: #e74c3c; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
    
    .admin-tabs { display: flex; background: white; border-bottom: 1px solid #ddd; padding: 0 30px; }
    .tab-btn { padding: 15px 20px; border: none; background: none; cursor: pointer; font-weight: 600; color: #777; border-bottom: 3px solid transparent; }
    .tab-btn.active { color: #2c3e50; border-bottom-color: #3498db; }
    
    .admin-content { flex: 1; padding: 30px; overflow-y: auto; max-width: 1000px; margin: 0 auto; width: 100%; box-sizing: border-box; }
    .tab-pane { display: none; }
    .tab-pane.active { display: block; }
    
    .admin-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; }
    h3 { margin-top: 0; color: #2c3e50; }
    
    textarea.admin-input, input.admin-input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; box-sizing: border-box; margin-bottom: 10px; }
    .admin-btn-action { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    
    .btn-sm { border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px; }
    .btn-del { background: #ffebee; color: #c62828; }
    .btn-edit { background: #e3f2fd; color: #1565c0; }

    /* MODAL DE EDICIÓN */
    #edit-modal-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 10001;
        display: none; align-items: center; justify-content: center;
    }
    #edit-modal-overlay.active { display: flex; }
    .edit-box {
        background: white; padding: 25px; border-radius: 8px; width: 400px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .edit-label { font-weight: bold; font-size: 12px; color: #666; display: block; margin-bottom: 5px; }
`;

export function initAdminPanel(isStandalone = false) {
    if (!api.isAdmin()) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const btnText = isStandalone ? "Cerrar Sesión" : "Volver al Juego";

    const dashboard = document.createElement('div');
    dashboard.id = 'admin-dashboard';
    dashboard.innerHTML = `
        <div class="admin-header">
            <div class="admin-title">Panel de Control Master</div>
            <button class="btn-close-admin" id="close-admin">${btnText}</button>
        </div>
        <div class="admin-tabs">
            <button class="tab-btn active" data-tab="users">Usuarios</button>
            <button class="tab-btn" data-tab="announcement">Anuncios</button>
            <button class="tab-btn" data-tab="content">Contenido</button>
        </div>
        
        <div class="admin-content">
            <!-- USERS -->
            <div class="tab-pane active" id="tab-users">
                <div class="admin-card">
                    <h3>Alta Masiva</h3>
                    <p style="font-size:13px; color:#666;">Correos @atxuri.net separados por coma:</p>
                    <textarea class="admin-input" id="bulk-emails" style="height:80px"></textarea>
                    <button class="admin-btn-action" id="btn-add-users">Dar de Alta</button>
                </div>
                <div class="admin-card">
                    <h3>Usuarios</h3>
                    <div id="users-list-container">Cargando...</div>
                </div>
            </div>

            <!-- ANNOUNCEMENT -->
            <div class="tab-pane" id="tab-announcement">
                <div class="admin-card">
                    <h3>Reto Global</h3>
                    <textarea class="admin-input" id="announce-msg" style="height:100px"></textarea>
                    <button class="admin-btn-action" id="btn-save-announce">Actualizar Mensaje</button>
                </div>
            </div>

            <!-- CONTENT -->
            <div class="tab-pane" id="tab-content">
                <div class="admin-card">
                    <h3>Gestión de Contenido</h3>
                    <div id="content-list-container">Cargando...</div>
                </div>
            </div>
        </div>

        <!-- MODAL EDICIÓN -->
        <div id="edit-modal-overlay">
            <div class="edit-box">
                <h3 style="margin-bottom: 15px;">Editar Contenido</h3>
                
                <div id="field-title-group">
                    <label class="edit-label">Título</label>
                    <input type="text" id="edit-title" class="admin-input">
                </div>

                <div id="field-desc-group">
                    <label class="edit-label">Descripción</label>
                    <textarea id="edit-desc" class="admin-input" style="height:80px"></textarea>
                </div>

                <div id="field-link-group">
                    <label class="edit-label">Enlace</label>
                    <input type="text" id="edit-link" class="admin-input">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
                    <button class="admin-btn-action" style="background:#ccc; color:#333" id="btn-cancel-edit">Cancelar</button>
                    <button class="admin-btn-action" id="btn-save-edit">Guardar Cambios</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dashboard);

    // --- EVENT HANDLERS ---
    document.getElementById('close-admin').onclick = () => {
        if (isStandalone) {
            if(confirm("¿Cerrar sesión Master?")) api.logout();
        } else {
            dashboard.classList.remove('active');
        }
    };

    if (!isStandalone) {
        const openBtn = document.createElement('button');
        openBtn.innerText = "⚙️";
        openBtn.style.cssText = "position:fixed; top:20px; right:20px; z-index:9999; padding:10px; background:#2c3e50; color:white; border:none; border-radius:50%; width:40px; height:40px; cursor:pointer; font-size:20px;";
        openBtn.onclick = () => {
            dashboard.classList.add('active');
            loadTabData('users');
        };
        document.body.appendChild(openBtn);
    } else {
        dashboard.classList.add('active');
        loadTabData('users');
    }

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            loadTabData(btn.dataset.tab);
        };
    });

    // Acciones
    document.getElementById('btn-add-users').onclick = async () => {
        const val = document.getElementById('bulk-emails').value;
        const res = await api.addAdminUsers(val);
        alert(res.message);
        document.getElementById('bulk-emails').value = '';
        loadTabData('users');
    };

    document.getElementById('btn-save-announce').onclick = async () => {
        await api.updateAnnouncement(document.getElementById('announce-msg').value);
        alert("Anuncio actualizado");
    };

    // --- MODAL EDICIÓN HANDLERS ---
    const editOverlay = document.getElementById('edit-modal-overlay');
    
    document.getElementById('btn-cancel-edit').onclick = () => {
        editOverlay.classList.remove('active');
        editingId = null;
    };

    document.getElementById('btn-save-edit').onclick = async () => {
        if (!editingId) return;

        try {
            if (editingType === 'node') {
                const data = {
                    title: document.getElementById('edit-title').value,
                    description: document.getElementById('edit-desc').value,
                    link: document.getElementById('edit-link').value
                };
                await api.adminUpdateNode(editingId, data);
            } else if (editingType === 'connection') {
                const desc = document.getElementById('edit-desc').value;
                await api.adminUpdateConnection(editingId, desc);
            }
            
            alert("Actualizado correctamente");
            editOverlay.classList.remove('active');
            loadTabData('content'); 

        } catch (e) {
            alert("Error: " + e.message);
        }
    };
}

// --- HELPER: Crear Tabla de forma segura sin innerHTML ---
function createTable(headers, rowsData, renderRowCallback) {
    const table = document.createElement('table');
    
    // Header
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    rowsData.forEach(item => {
        const tr = renderRowCallback(item);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
}

async function loadTabData(tab) {
    if (tab === 'users') {
        const users = await api.getAdminUsers();
        const container = document.getElementById('users-list-container');
        container.innerHTML = '';

        const table = createTable(['Email', 'Estado', 'Acciones'], users, (u) => {
            const tr = document.createElement('tr');
            
            // Email Col
            const tdEmail = document.createElement('td');
            tdEmail.innerHTML = `${u.email}<br><small style="color:#999">${u.role}</small>`; // Email is mostly safe, role is enum
            
            // Status Col
            const tdStatus = document.createElement('td');
            const isActive = !!u.password;
            const statusSpan = document.createElement('span');
            statusSpan.textContent = isActive ? 'Activo' : 'Pendiente';
            statusSpan.style.color = isActive ? 'green' : 'orange';
            tdStatus.appendChild(statusSpan);

            // Actions Col
            const tdActions = document.createElement('td');
            if (u.role !== 'admin') {
                const btnReset = document.createElement('button');
                btnReset.className = "btn-sm";
                btnReset.style.cssText = "background:#fff3e0; color:#e65100";
                btnReset.textContent = "Reset";
                btnReset.onclick = () => window.resetUser(u.id);

                const btnDel = document.createElement('button');
                btnDel.className = "btn-sm btn-del";
                btnDel.textContent = "Borrar";
                btnDel.onclick = () => window.deleteUser(u.id);

                tdActions.appendChild(btnReset);
                tdActions.appendChild(btnDel);
            } else {
                tdActions.textContent = '-';
            }

            tr.appendChild(tdEmail);
            tr.appendChild(tdStatus);
            tr.appendChild(tdActions);
            return tr;
        });

        container.appendChild(table);
    } 
    else if (tab === 'announcement') {
        const data = await api.getAnnouncement();
        document.getElementById('announce-msg').value = data.message || '';
    }
    else if (tab === 'content') {
        const data = await api.getAdminContent();
        currentAdminData = data;
        
        const container = document.getElementById('content-list-container');
        container.innerHTML = '';

        // 1. Tabla de Nodos
        const h4Nodes = document.createElement('h4');
        h4Nodes.textContent = `Nodos (${data.nodes.length})`;
        h4Nodes.style.marginBottom = '5px';
        container.appendChild(h4Nodes);

        const nodesTable = createTable(['Título', 'Descripción', 'Acciones'], data.nodes, (n) => {
            const tr = document.createElement('tr');

            const tdTitle = document.createElement('td');
            const b = document.createElement('b');
            b.textContent = n.title; // SAFE
            tdTitle.appendChild(b);

            const tdDesc = document.createElement('td');
            tdDesc.style.cssText = "color:#666; font-size:12px";
            let shortDesc = n.description || '';
            if (shortDesc.length > 50) shortDesc = shortDesc.substring(0, 50) + '...';
            tdDesc.textContent = shortDesc; // SAFE

            const tdActions = document.createElement('td');
            
            const btnEdit = document.createElement('button');
            btnEdit.className = "btn-sm btn-edit";
            btnEdit.textContent = "Editar";
            btnEdit.onclick = () => window.openEditModal('node', n.id);

            const btnDel = document.createElement('button');
            btnDel.className = "btn-sm btn-del";
            btnDel.textContent = "Borrar";
            btnDel.onclick = () => window.adminDeleteNode(n.id);

            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDel);

            tr.appendChild(tdTitle);
            tr.appendChild(tdDesc);
            tr.appendChild(tdActions);
            return tr;
        });
        container.appendChild(nodesTable);

        // 2. Tabla de Conexiones
        const h4Conns = document.createElement('h4');
        h4Conns.textContent = `Conexiones (${data.connections.length})`;
        h4Conns.style.cssText = "margin-top:30px; margin-bottom:5px";
        container.appendChild(h4Conns);

        const connsTable = createTable(['Descripción', 'Acciones'], data.connections, (c) => {
            const tr = document.createElement('tr');

            const tdDesc = document.createElement('td');
            tdDesc.textContent = c.description || 'Sin descripción'; // SAFE

            const tdActions = document.createElement('td');
            tdActions.style.width = "120px";

            const btnEdit = document.createElement('button');
            btnEdit.className = "btn-sm btn-edit";
            btnEdit.textContent = "Editar";
            btnEdit.onclick = () => window.openEditModal('connection', c.id);

            const btnDel = document.createElement('button');
            btnDel.className = "btn-sm btn-del";
            btnDel.textContent = "Borrar";
            btnDel.onclick = () => window.adminDeleteConn(c.id);

            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDel);

            tr.appendChild(tdDesc);
            tr.appendChild(tdActions);
            return tr;
        });
        container.appendChild(connsTable);
    }
}

// --- GLOBALS ---
window.openEditModal = (type, id) => {
    editingType = type;
    editingId = id;
    
    const overlay = document.getElementById('edit-modal-overlay');
    const titleGroup = document.getElementById('field-title-group');
    const linkGroup = document.getElementById('field-link-group');
    
    document.getElementById('edit-title').value = '';
    document.getElementById('edit-desc').value = '';
    document.getElementById('edit-link').value = '';

    if (type === 'node') {
        const node = currentAdminData.nodes.find(n => n.id === id);
        if (node) {
            document.getElementById('edit-title').value = node.title;
            document.getElementById('edit-desc').value = node.description || '';
            document.getElementById('edit-link').value = node.link || ''; 
        }
        titleGroup.style.display = 'block';
        linkGroup.style.display = 'block';
    } 
    else if (type === 'connection') {
        const conn = currentAdminData.connections.find(c => c.id === id);
        if (conn) {
            document.getElementById('edit-desc').value = conn.description || '';
        }
        titleGroup.style.display = 'none';
        linkGroup.style.display = 'none';
    }

    overlay.classList.add('active');
};

window.deleteUser = async (id) => {
    if(confirm("¿Borrar usuario?")) {
        await api.deleteUser(id);
        loadTabData('users');
    }
};
window.adminDeleteNode = async (id) => {
    if(confirm("¿Borrar nodo?")) {
        await api.adminDeleteNode(id);
        loadTabData('content');
    }
};
window.adminDeleteConn = async (id) => {
    if(confirm("¿Borrar conexión?")) {
        await api.adminDeleteConn(id);
        loadTabData('content');
    }
};
window.resetUser = async (id) => {
    if(confirm("¿Resetear contraseña?")) {
        await api.adminResetUser(id);
        loadTabData('users');
    }
};