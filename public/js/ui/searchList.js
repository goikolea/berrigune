import { teleportPlayer } from '../entities/player.js';

const styles = `
    /* BOTÓN LUPA */
    #btn-search-toggle {
        position: absolute;
        bottom: 280px; 
        left: 20px;
        width: 44px; height: 44px; /* Larger touch target */
        background: white;
        border-radius: 50%;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        border: 1px solid #eee;
        cursor: pointer;
        z-index: 9001;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px;
        transition: transform 0.2s, background 0.2s;
    }
    #btn-search-toggle:hover { transform: scale(1.1); background: #f9f9f9; }

    /* PANEL DE LISTA */
    #search-panel {
        position: absolute;
        bottom: 340px; 
        left: 20px;
        width: 280px;          
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

    /* MOBILE: Center panel on screen */
    @media (max-width: 600px) {
        #search-panel {
            left: 50%; top: 50%; bottom: auto;
            transform: translate(-50%, -50%);
            width: 90%;
            max-height: 60vh;
        }
    }

    .search-header {
        padding: 15px;
        background: #f5f5f7;
        border-bottom: 1px solid #eee;
        font-weight: 700; color: #333;
        font-size: 14px;
        display: flex; justify-content: space-between; align-items: center;
        border-radius: 12px 12px 0 0;
        flex-shrink: 0; 
    }

    .search-content {
        padding: 10px;
        overflow-y: auto; 
        flex: 1;          
    }

    .search-group-title {
        font-size: 11px; font-weight: 800; text-transform: uppercase;
        color: #aaa; margin: 15px 0 5px 5px;
        letter-spacing: 0.5px;
    }
    .search-group-title:first-child { margin-top: 0; }

    .search-item {
        padding: 10px;
        margin-bottom: 2px;
        border-radius: 6px;
        cursor: pointer;
        display: flex; align-items: center; gap: 10px;
    }
    .search-item:hover { background: #eef4ff; }
    
    .dot-indicator {
        width: 8px; height: 8px; border-radius: 50%;
        flex-shrink: 0;
    }
    .item-title {
        font-size: 14px; color: #444; font-weight: 500;
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
            <span style="font-size:24px; color:#999; cursor:pointer; padding:0 5px;" id="close-search">×</span>
        </div>
        <div class="search-content" id="search-content"></div>
    `;
    document.body.appendChild(panel);

    btn.onclick = (e) => {
        e.stopPropagation(); 
        const userPanel = document.getElementById('profile-panel');
        if (userPanel) userPanel.classList.remove('active');
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
        title.textContent = catName; 
        content.appendChild(title);

        groups[catName].forEach(node => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.title = node.title || "Sin título"; 

            const dot = document.createElement('div');
            dot.className = 'dot-indicator';
            dot.style.background = node.cat_color || '#999';

            const itemTitle = document.createElement('div');
            itemTitle.className = 'item-title';
            itemTitle.textContent = node.title || "Sin título"; 

            item.appendChild(dot);
            item.appendChild(itemTitle);
            
            item.onclick = () => {
                jumpToNode(node);
                // Close panel on mobile after click
                if(window.innerWidth < 600) document.getElementById('search-panel').classList.remove('active');
            };
            
            content.appendChild(item);
        });
    });
}

function jumpToNode(node) {
    teleportPlayer(node.x, node.y + 100);
}