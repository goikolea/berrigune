let onCloseCallback = null;

const styles = `
    #sidebar {
        position: fixed; top: 0; right: -450px; width: 400px; height: 100%;
        background: #FFFFFF; border-left: 2px solid #1a1a1a;
        box-shadow: -5px 0 15px rgba(0,0,0,0.05); 
        padding: 40px; box-sizing: border-box; 
        transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
        z-index: 9999;
        display: flex; flex-direction: column;
        overflow-y: auto; /* HACER SCROLL SI EL TEXTO ES LARGO */
    }
    #sidebar.active { right: 0; }
    
    /* Contenedor de etiquetas */
    .badges-row {
        display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
    }

    .badge { 
        display: inline-block;
        padding: 6px 12px; border-radius: 6px; 
        font-size: 11px; font-weight: 700; 
        text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Estilo por defecto (Tipo) */
    .badge-type {
        background: #1a1a1a; color: #fff; 
    }

    /* Estilo dinámico (Categoría) */
    .badge-cat {
        background: #f0f0f0; color: #333; border: 1px solid #ddd;
    }

    .sidebar-title { 
        font-size: 28px; font-weight: 800; color: #1a1a1a; 
        margin: 0 0 20px 0; line-height: 1.2; 
    }
    
    .sidebar-text { 
        font-size: 16px; color: #444; line-height: 1.6; 
        margin-bottom: 30px; white-space: pre-line; /* Respetar saltos de línea */
    }
    
    .action-btn { 
        background: #1a1a1a; color: #fff; text-decoration: none; 
        padding: 12px 24px; border-radius: 6px; font-weight: 600; 
        text-align: center; align-self: flex-start; transition: transform 0.1s;
        display: inline-block;
    }
    .action-btn:hover { transform: translateY(-2px); background: #333; }
    
    .close-btn { 
        position: absolute; top: 20px; right: 20px; 
        background: none; border: none; font-size: 24px; cursor: pointer; color: #999;
    }
    .close-btn:hover { color: #1a1a1a; }
`;

export function initSidebar() {
    if (document.getElementById('sidebar')) return;

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
        <button class="close-btn" id="close-sidebar">×</button>
        
        <div class="badges-row">
            <span id="ui-badge-type" class="badge badge-type">Tipo</span>
            <span id="ui-badge-cat" class="badge badge-cat">Categoría</span>
        </div>

        <h2 id="ui-title" class="sidebar-title">Título</h2>
        <p id="ui-text" class="sidebar-text">Descripción</p>
        <a id="ui-link" href="#" target="_blank" class="action-btn">Ver Recurso</a>
    `;
    document.body.appendChild(sidebar);

    document.getElementById('close-sidebar').onclick = closeSidebar;
}

// Helper para aclarar/oscurecer colores hexadecimales (para el fondo del badge)
function adjustColor(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

export function openSidebar(data, onClose) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    // 1. Datos básicos
    document.getElementById('ui-badge-type').innerText = data.type || "Info";
    document.getElementById('ui-title').innerText = data.title || "Sin Título";
    document.getElementById('ui-text').innerText = data.description || "";
    
    // 2. Link
    const btnLink = document.getElementById('ui-link');
    if (data.link) {
        btnLink.href = data.link;
        btnLink.style.display = 'inline-block';
        btnLink.innerText = "Abrir Enlace";
    } else {
        btnLink.style.display = 'none';
    }

    // 3. Configurar Badge de Categoría (Color + Nombre)
    const badgeCat = document.getElementById('ui-badge-cat');
    badgeCat.innerText = data.category || "General";
    
    // Estilizado dinámico del badge de categoría
    if (data.color) {
        // Fondo claro (color + 150 de luz) para que sea pastel
        // Texto oscuro (color original)
        // Borde (color original)
        // Nota: Esto es un truco visual simple.
        badgeCat.style.backgroundColor = data.color + '20'; // 20 hex = baja opacidad si el navegador soporta rrggbbaa
        badgeCat.style.color = data.color;
        badgeCat.style.borderColor = data.color;
        
        // Fallback si el color viene en formato simple, ponemos borde a la izquierda
        badgeCat.style.borderLeft = `4px solid ${data.color}`;
    }

    sidebar.classList.add('active');
    onCloseCallback = onClose; 
}

export function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('active');
    
    if (onCloseCallback) {
        onCloseCallback();
        onCloseCallback = null;
    }
}