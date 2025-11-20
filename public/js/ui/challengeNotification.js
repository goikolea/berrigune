import { api } from '../services/api.js';

const styles = `
    #global-notification {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 300px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.15);
        border-left: 5px solid #FFD700; 
        font-family: 'Segoe UI', sans-serif;
        z-index: 8000;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
        overflow: hidden;
        display: none; 
    }
    
    /* ESTADO MINIMIZADO */
    #global-notification.minimized {
        width: 40px; 
        height: 40px;
        border-radius: 50%;
        background: white;
        border: 1px solid #eee; 
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        
        /* CENTRADO */
        display: flex;
        align-items: center;
        justify-content: center;
        
        cursor: pointer;
        padding: 0;
    }
    
    #global-notification.minimized:hover {
        transform: scale(1.1); 
        background: #f9f9f9;
    }
    
    .notif-header {
        padding: 12px 15px;
        background: #FFFDF5;
        border-bottom: 1px solid #eee;
        font-size: 12px; font-weight: 800; 
        color: #B8860B; text-transform: uppercase; letter-spacing: 1px;
        display: flex; justify-content: space-between; align-items: center;
        cursor: pointer;
    }
    
    .notif-body {
        padding: 15px;
        font-size: 14px; color: #333; line-height: 1.5;
        font-weight: 500;
    }
    
    .minimize-btn {
        font-size: 18px; color: #ccc; transition: 0.2s; line-height: 1;
    }
    .minimize-btn:hover { color: #333; }

    /* ICONO MINIMIZADO */
    .minimized-icon {
        display: none;
        font-size: 20px;
        line-height: 1;
        user-select: none;
        
        /* --- AJUSTE ÓPTICO --- */
        /* Empujamos el icono un poco abajo y a la derecha para centrar el dibujo */
        padding-top: 7px;
        padding-left: 4px;
    }
    
    #global-notification.minimized .minimized-icon { display: block; }
    #global-notification.minimized .notif-header, 
    #global-notification.minimized .notif-body { display: none; }
`;

export function initChallengeNotification() {
    if (document.getElementById('global-notification')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const box = document.createElement('div');
    box.id = 'global-notification';
    box.innerHTML = `
        <div class="minimized-icon">📢</div>
        <div class="notif-header" id="notif-header">
            <span>📢 Reto Global</span>
            <span class="minimize-btn" title="Minimizar">−</span>
        </div>
        <div class="notif-body" id="notif-msg">
            Cargando reto...
        </div>
    `;
    document.body.appendChild(box);

    const toggle = () => box.classList.toggle('minimized');

    box.onclick = (e) => {
        if (box.classList.contains('minimized')) {
            toggle();
        }
    };

    document.getElementById('notif-header').onclick = (e) => {
        e.stopPropagation(); 
        toggle();
    };

    loadMessage();
}

async function loadMessage() {
    try {
        const data = await api.getAnnouncement();
        const box = document.getElementById('global-notification');
        
        if (data && data.message && data.message.trim() !== "") {
            document.getElementById('notif-msg').innerText = data.message;
            box.style.display = 'block'; 
        } else {
            box.style.display = 'none';
        }
    } catch (e) {
        console.error("Error cargando anuncio", e);
    }
}