import { api } from '../services/api.js';

const styles = `
    /* BOTÓN USUARIO */
    #btn-user-profile {
        position: absolute;
        bottom: 230px; 
        left: 20px;
        width: 40px; height: 40px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        border: 1px solid #eee;
        cursor: pointer;
        z-index: 9001;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        transition: transform 0.2s;
    }
    #btn-user-profile:hover { transform: scale(1.1); background: #f9f9f9; }

    /* PANEL DE PERFIL */
    #profile-panel {
        position: absolute;
        bottom: 230px; 
        left: 70px;    
        width: 280px;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        display: none; 
        flex-direction: column;
        padding: 20px;
        z-index: 9001;
        font-family: 'Segoe UI', sans-serif;
        border: 1px solid rgba(0,0,0,0.1);
    }
    #profile-panel.active { display: flex; }

    .profile-header {
        font-size: 14px; font-weight: 700; color: #333;
        margin-bottom: 5px; border-bottom: 1px solid #eee;
        padding-bottom: 10px; 
        display: flex; justify-content: space-between; align-items: center; 
    }
    .profile-email { font-size: 12px; color: #666; font-weight: 400; margin-left: 5px;}

    /* BOTÓN CERRAR */
    .close-profile-btn {
        font-size: 18px; color: #999; cursor: pointer; line-height: 1; padding: 0 5px;
    }
    .close-profile-btn:hover { color: #333; }

    /* BADGES SECTION */
    .badge-item { margin-top: 15px; }
    .badge-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
    .badge-title { font-weight: 700; color: #444; }
    .badge-status { color: #888; }
    
    /* PROGRESO */
    .progress-track {
        width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;
    }
    .progress-fill {
        height: 100%; width: 0%; transition: width 0.5s ease-out;
        border-radius: 4px;
    }
    
    .fill-sembrador { background: linear-gradient(90deg, #FF9A9E 0%, #FECFEF 100%); }
    .fill-conector { background: linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%); }
    
    .completed { color: #2ECC71; font-weight: bold; }
    
    .logout-btn {
        margin-top: 20px;
        font-size: 11px; color: #E04F5F; text-decoration: underline; cursor: pointer;
        align-self: flex-end; background: none; border: none;
    }
`;

const BADGES_CONFIG = {
    SEMBRADOR: { target: 10, icon: '🌱', title: 'Sembrador', desc: 'Crear Nodos' },
    CONECTOR:  { target: 5,  icon: '🕸️', title: 'Conector',  desc: 'Crear Conexiones' }
};

export function initUserProfile() {
    if (document.getElementById('btn-user-profile')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const btn = document.createElement('button');
    btn.id = 'btn-user-profile';
    btn.innerHTML = '👤';
    btn.title = "Mi Perfil";
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'profile-panel';
    panel.innerHTML = `
        <div class="profile-header">
            <span>👤 <span id="user-email-display" class="profile-email">Cargando...</span></span>
            <span id="close-profile" class="close-profile-btn">×</span>
        </div>
        
        <!-- Sembrador -->
        <div class="badge-item">
            <div class="badge-header">
                <span class="badge-title">${BADGES_CONFIG.SEMBRADOR.icon} ${BADGES_CONFIG.SEMBRADOR.title}</span>
                <span class="badge-status" id="stats-sembrador">0/${BADGES_CONFIG.SEMBRADOR.target}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill fill-sembrador" id="fill-sembrador"></div>
            </div>
        </div>

        <!-- Conector -->
        <div class="badge-item">
            <div class="badge-header">
                <span class="badge-title">${BADGES_CONFIG.CONECTOR.icon} ${BADGES_CONFIG.CONECTOR.title}</span>
                <span class="badge-status" id="stats-conector">0/${BADGES_CONFIG.CONECTOR.target}</span>
            </div>
            <div class="progress-track">
                <div class="progress-fill fill-conector" id="fill-conector"></div>
            </div>
        </div>
        
        <button id="btn-logout" class="logout-btn">Cerrar Sesión</button>
    `;
    document.body.appendChild(panel);

    // --- EVENTO MODIFICADO: LÓGICA DE EXCLUSIÓN ---
    btn.onclick = (e) => {
        e.stopPropagation();
        
        // 1. Cerrar el panel de Búsqueda si está abierto
        const searchPanel = document.getElementById('search-panel');
        if (searchPanel) searchPanel.classList.remove('active');

        // 2. Alternar este panel
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            updateProfileData();
        }
    };

    document.getElementById('close-profile').onclick = () => {
        panel.classList.remove('active');
    };
    
    panel.onclick = (e) => e.stopPropagation();

    document.getElementById('btn-logout').onclick = () => {
        if(confirm("¿Salir del Campus?")) api.logout();
    };
}

async function updateProfileData() {
    try {
        const stats = await api.getUserStats();
        
        document.getElementById('user-email-display').innerText = stats.email;

        updateBadgeUI('sembrador', stats.nodes_created, BADGES_CONFIG.SEMBRADOR.target);
        updateBadgeUI('conector', stats.connections_created, BADGES_CONFIG.CONECTOR.target);

    } catch (e) {
        console.error("Error cargando perfil", e);
        document.getElementById('user-email-display').innerText = "Error de conexión";
    }
}

function updateBadgeUI(id, current, target) {
    const percent = Math.min(100, (current / target) * 100);
    const fillEl = document.getElementById(`fill-${id}`);
    const textEl = document.getElementById(`stats-${id}`);
    
    fillEl.style.width = `${percent}%`;
    
    if (current >= target) {
        textEl.innerText = `¡CONSEGUIDO! ${current} / ${target}`;
        textEl.classList.add('completed');
    } else {
        textEl.innerText = `${current} / ${target}`;
        textEl.classList.remove('completed');
    }
}