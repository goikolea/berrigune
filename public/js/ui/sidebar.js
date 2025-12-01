import { openConnectionModal } from './connectionModal.js';
import { api } from '../services/api.js';
import { objects } from '../entities/innovationObject.js';

let onCloseCallback = null;
let currentObject = null; 
let onConnDeletedCallback = null; 

const styles = `
    #sidebar {
        position: fixed; top: 0; 
        
        /* RESPONSIVE: Start off-screen (-100%) */
        right: -100%; 
        width: 100%; max-width: 450px; /* Take full width on mobile, limit on desktop */
        
        height: 100%;
        background: #FFFFFF; border-left: 2px solid #1a1a1a;
        box-shadow: -5px 0 15px rgba(0,0,0,0.05); 
        padding: 30px; box-sizing: border-box; 
        transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
        z-index: 9999;
        display: flex; flex-direction: column;
        overflow-y: auto;
    }
    #sidebar.active { right: 0; }
    
    .badges-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .badge { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-type { background: #1a1a1a; color: #fff; }
    .badge-cat { background: #f0f0f0; color: #333; border: 1px solid #ddd; }

    .sidebar-title { font-size: 24px; font-weight: 800; color: #1a1a1a; margin: 0 0 15px 0; }
    .sidebar-text { font-size: 16px; color: #444; line-height: 1.6; margin-bottom: 30px; white-space: pre-line; }
    
    .action-btn { background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; display: inline-block; text-align: center;}
    
    .header-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px; margin-bottom: 10px; }
    .btn-icon { background: #f5f5f7; border: 1px solid #ddd; width: 42px; height: 42px; border-radius: 8px; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
    .btn-icon:hover { background: #e0e0e0; transform: scale(1.05); }

    .close-btn { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 32px; cursor: pointer; color: #999; z-index: 10; padding: 10px;}
    
    .conn-list-section { margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; padding-bottom: 50px;} /* Extra padding for mobile scroll */
    .conn-header { font-size: 14px; font-weight: 700; color: #999; text-transform: uppercase; margin-bottom: 15px; }
    .conn-item { 
        background: #fff; border: 1px solid #eee; border-radius: 8px; 
        padding: 12px; margin-bottom: 10px; font-size: 14px; 
        display: flex; justify-content: space-between; align-items: center;
    }
    .conn-info { flex: 1; }
    .conn-target { font-weight: 700; color: #333; display: block; }
    .conn-desc { font-size: 12px; color: #666; font-style: italic; }
    
    .btn-delete-conn { 
        display: inline-flex; align-items: center; justify-content: center;
        background: #FFF0F0; color: #E04F5F; border: 1px solid #fad0d0;
        border-radius: 4px; width: 30px; height: 30px; 
        cursor: pointer; font-size: 16px; margin-left: 10px; line-height: 1;
        transition: background 0.2s;
    }
`;

export function initSidebar() {
    if (document.getElementById('sidebar')) return;
    const s = document.createElement("style"); s.innerText = styles; document.head.appendChild(s);

    const sb = document.createElement('div');
    sb.id = 'sidebar';
    sb.innerHTML = `
        <button class="close-btn" id="close-sidebar">×</button>
        <div class="header-actions">
            <button id="sidebar-btn-conn" class="btn-icon" title="Conectar">🔗</button>
        </div>
        <div class="badges-row">
            <span id="ui-badge-type" class="badge badge-type"></span>
            <span id="ui-badge-cat" class="badge badge-cat"></span>
        </div>
        <h2 id="ui-title" class="sidebar-title"></h2>
        <p id="ui-text" class="sidebar-text"></p>
        <a id="ui-link" href="#" target="_blank" class="action-btn">Ver Recurso</a>
        
        <div class="conn-list-section">
            <div class="conn-header">Conexiones</div>
            <div id="conn-list-container"></div>
        </div>
    `;
    document.body.appendChild(sb);
    document.getElementById('close-sidebar').onclick = closeSidebar;
}

export function openSidebar(objRef, allConnections, onConnDeleted, onClose) {
    currentObject = objRef;
    onConnDeletedCallback = onConnDeleted;
    onCloseCallback = onClose;

    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    
    const data = objRef.dataRef; 
    document.getElementById('ui-badge-type').innerText = data.type_name || "Info";
    document.getElementById('ui-title').innerText = data.title || "Sin Título";
    document.getElementById('ui-text').innerText = data.description || "";
    
    const btnLink = document.getElementById('ui-link');
    if (data.link) {
        const safeLink = data.link.trim();
        if(safeLink.startsWith('http://') || safeLink.startsWith('https://')) {
            btnLink.href = safeLink;
        } else {
             btnLink.href = '#'; 
        }
        btnLink.style.display = 'block'; // Block for full width button on mobile
        btnLink.innerText = "Abrir Enlace";
    } else {
        btnLink.style.display = 'none';
    }

    const badgeCat = document.getElementById('ui-badge-cat');
    badgeCat.innerText = data.cat_name || "General";
    if (data.cat_color) {
        badgeCat.style.backgroundColor = data.cat_color + '20'; 
        badgeCat.style.color = data.cat_color;
        badgeCat.style.borderColor = data.cat_color;
    }

    document.getElementById('sidebar-btn-conn').onclick = () => openConnectionModal(objRef, null);

    updateConnectionList(allConnections);

    sidebar.classList.add('active');
}

export function updateConnectionList(allConnections) {
    if (!currentObject) return;
    const container = document.getElementById('conn-list-container');
    container.innerHTML = '';

    const myId = currentObject.dataRef.id;
    const currentUserId = api.getCurrentUserId();

    const relevant = allConnections.filter(c => c.source_node_id === myId || c.target_node_id === myId);

    if (relevant.length === 0) {
        container.innerHTML = '<div style="color:#ccc; font-size:13px;">Sin conexiones</div>';
        return;
    }

    relevant.forEach(c => {
        const isSource = c.source_node_id === myId;
        const otherId = isSource ? c.target_node_id : c.source_node_id;
        const otherObj = objects.find(o => o.dataRef.id === otherId);
        const otherName = otherObj ? otherObj.dataRef.title : 'Nodo desconocido';
        const relation = c.description || (isSource ? '→' : '←');

        const div = document.createElement('div');
        div.className = 'conn-item';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'conn-info';

        const targetSpan = document.createElement('span');
        targetSpan.className = 'conn-target';
        targetSpan.textContent = (isSource ? '→ ' : '← ') + otherName; 

        const descSpan = document.createElement('span');
        descSpan.className = 'conn-desc';
        descSpan.textContent = relation; 

        infoDiv.appendChild(targetSpan);
        infoDiv.appendChild(descSpan);
        div.appendChild(infoDiv);

        const connUserId = String(c.user_id || "").trim();
        const myUserIdStr = String(currentUserId || "").trim();

        if (connUserId === myUserIdStr && myUserIdStr !== "") {
            const btnDel = document.createElement('button');
            btnDel.className = 'btn-delete-conn';
            btnDel.title = "Borrar conexión";
            btnDel.textContent = "✕";
            btnDel.onclick = async (e) => {
                e.stopPropagation();
                if(confirm('¿Borrar esta conexión?')) {
                    try {
                        await api.deleteConnection(c.id);
                        if(onConnDeletedCallback) onConnDeletedCallback(); 
                    } catch(err) { alert(err.message); }
                }
            };
            div.appendChild(btnDel);
        }

        container.appendChild(div);
    });
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
    currentObject = null;
    if (onCloseCallback) {
        onCloseCallback();
        onCloseCallback = null;
    }
}