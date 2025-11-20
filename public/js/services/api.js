// js/services/api.js

let authToken = localStorage.getItem('campus_token'); // Recuperar token
let currentUserId = null; // Guardaremos solo el ID, que es lo que importa para comparar

// --- FUNCIÓN AUXILIAR PARA LEER EL JWT ---
function parseJwt (token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

// --- INICIALIZACIÓN INMEDIATA ---
// Si hay token guardado, extraemos el ID del usuario al instante
if (authToken) {
    const payload = parseJwt(authToken);
    if (payload && payload.id) {
        currentUserId = payload.id;
    }
}

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
});

export const api = {
    isLoggedIn: () => !!authToken,

    // Devuelve el ID decodificado del token
    getCurrentUserId: () => currentUserId,

    login: async (email, code) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        if (!res.ok) throw new Error('Login fallido');
        
        const data = await res.json();
        
        // Guardar Token
        authToken = data.token;
        localStorage.setItem('campus_token', authToken);
        
        // Actualizar ID en memoria leyendo del nuevo token
        const payload = parseJwt(authToken);
        if (payload) currentUserId = payload.id;

        return data.user;
    },

    getCategories: async () => {
        const res = await fetch('/api/categories', { headers: getHeaders() });
        return res.json();
    },
    
    getSignalTypes: async () => {
        const res = await fetch('/api/signal-types', { headers: getHeaders() });
        return res.json();
    },

    getNodes: async () => {
        const res = await fetch('/api/nodes', { headers: getHeaders() });
        if (res.status === 401) {
            api.logout(); // Si el token caducó, fuera
            return null;
        }
        return res.json();
    },

    createNode: async (nodeData) => {
        const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(nodeData)
        });
        if (!res.ok) throw new Error('Error guardando nodo');
        return res.json();
    },

    getConnections: async () => {
        const res = await fetch('/api/connections', { headers: getHeaders() });
        return res.json();
    },

    createConnection: async (connData) => {
        const res = await fetch('/api/connections', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(connData)
        });
        if (!res.ok) throw new Error('Error conectando nodos');
        return res.json();
    },

    deleteConnection: async (id) => {
        const res = await fetch(`/api/connections/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!res.ok) throw new Error('Error borrando conexión');
        return res.json();
    },

    updateNodePosition: async (id, x, y) => {
        const res = await fetch(`/api/nodes/${id}/position`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ x, y })
        });
        if (!res.ok) throw new Error('No puedes mover este nodo');
        return res.json();
    },
    
    logout: () => {
        authToken = null;
        currentUserId = null;
        localStorage.removeItem('campus_token');
        window.location.reload();
    },

    getUserStats: async () => {
        const res = await fetch('/api/user-stats', { headers: getHeaders() });
        return res.json();
    },
    
    getAnnouncement: async () => {
        const res = await fetch('/api/announcement', { headers: getHeaders() });
        return res.json();
    }
};