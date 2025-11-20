import { teleportPlayer } from '../entities/player.js';
import { updateCamera } from '../core/camera.js';

const styles = `
    /* BOTÓN LUPA */
    #btn-search-toggle {
        position: absolute;
        bottom: 280px; 
        left: 20px;
        width: 40px; height: 40px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        border: 1px solid #eee;
        cursor: pointer;
        z-index: 9001;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        transition: transform 0.2s, background 0.2s;
    }
    #btn-search-toggle:hover { transform: scale(1.1); background: #f9f9f9; }

    /* PANEL DE LISTA */
    #search-panel {
        position: absolute;
        bottom: 330px; 
        left: 20px;
        width: 260px;          
        max-height: 350px;     
        
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        
        display: none; 
        flex-direction: column; 
        
        z-index: 9001;
        font-family: 'Segoe UI', sans-serif;
        border: 1px solid rgba(0,0,0,0.1);
    }
    #search-panel.active { display: flex; }

    .search-header {
        padding: 12px 15px;
        background: #f5f5f7;
        border-bottom: 1px solid #eee;
        font-weight: 700; color: #333;
        font-size: 13px;
        display: flex; justify-content: space-between; align-items: center;
        border-radius: 12px 12px 0 0;
        flex-shrink: 0; 
    }

    .search-content {
        padding: 10px;
        overflow-y: auto; 
        flex: 1;          
        scrollbar-width: thin;
        scrollbar-color: #ccc transparent;
    }

    .search-content::-webkit-scrollbar { width: 6px; }
    .search-content::-webkit-scrollbar-track { background: transparent; }
    .search-content::-webkit-scrollbar-thumb { background-color: #ccc; border-radius: 10px; }
    .search-content::-webkit-scrollbar-thumb:hover { background-color: #999; }

    .search-group-title {
        font-size: 10px; font-weight: 800; text-transform: uppercase;
        color: #aaa; margin: 10px 0 5px 5px;
        letter-spacing: 0.5px;
    }
    .search-group-title:first-child { margin-top: 0; }

    .search-item {
        padding: 8px 10px;
        margin-bottom: 2px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.1s;
        display: flex; align-items: center; gap: 10px;
    }
    .search-item:hover { background: #eef4ff; }
    
    .dot-indicator {
        width: 8px; height: 8px; border-radius: 50%;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .item-title {
        font-size: 13px; color: #444; font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
`;

export function initSearchList(nodesData) {
    if (document.getElementById('btn-search-toggle')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const btn = document.createElement('button');
    btn.id = 'btn-search-toggle';
    btn.innerHTML = '🔍';
    btn.title = "Directorio";
    document.body.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'search-panel';
    panel.innerHTML = `
        <div class="search-header">
            Directorio
            <span style="font-size:14px; color:#999; cursor:pointer; padding:0 5px;" id="close-search">×</span>
        </div>
        <div class="search-content" id="search-content"></div>
    `;
    document.body.appendChild(panel);

    // --- EVENTO MODIFICADO: LÓGICA DE EXCLUSIÓN ---
    btn.onclick = (e) => {
        e.stopPropagation(); 
        
        // 1. Cerrar el panel de Usuario si está abierto
        const userPanel = document.getElementById('profile-panel');
        if (userPanel) userPanel.classList.remove('active');

        // 2. Alternar este panel
        panel.classList.toggle('active');
    };

    document.getElementById('close-search').onclick = () => {
        panel.classList.remove('active');
    };

    renderList(nodesData);
}

export function renderList(nodesData) {
    const content = document.getElementById('search-content');
    if (!content) return;
    content.innerHTML = '';

    if (!nodesData || nodesData.length === 0) {
        content.innerHTML = '<div style="padding:20px; color:#ccc; text-align:center; font-size:12px;">Lista vacía</div>';
        return;
    }

    const groups = {};
    nodesData.forEach(node => {
        const cat = node.cat_name || 'Otros';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(node);
    });

    const sortedCats = Object.keys(groups).sort();

    sortedCats.forEach(catName => {
        const title = document.createElement('div');
        title.className = 'search-group-title';
        title.innerText = catName;
        content.appendChild(title);

        groups[catName].forEach(node => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.title = node.title; 
            item.innerHTML = `
                <div class="dot-indicator" style="background:${node.cat_color || '#999'}"></div>
                <div class="item-title">${node.title}</div>
            `;
            
            item.onclick = () => {
                jumpToNode(node);
            };
            
            content.appendChild(item);
        });
    });
}

function jumpToNode(node) {
    teleportPlayer(node.x, node.y + 100);
}