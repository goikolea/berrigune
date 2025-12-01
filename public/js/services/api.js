// js/services/api.js

let authToken = localStorage.getItem('campus_token');
let currentUserId = null;
let currentUserRole = 'user'; // Variable crítica

function parseJwt (token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return null; }
}

// Inicialización al cargar la página (F5)
if (authToken) {
    const payload = parseJwt(authToken);
    if (payload) {
        currentUserId = payload.id;
        currentUserRole = payload.role || 'user';
    }
}

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
});

export const api = {
    isLoggedIn: () => !!authToken,
    getCurrentUserId: () => currentUserId,
    isAdmin: () => currentUserRole === 'admin', // Chequeo de rol

    getPublicConfig: async () => {
        const res = await fetch('/api/public-config');
        return res.json();
    },

    checkUserStatus: async (email) => {
        const res = await fetch('/api/check-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        return res.json();
    },

    activate: async (email, centerCode, newPassword) => {
        const res = await fetch('/api/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, centerCode, newPassword })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Error al activar');
        }
        const data = await res.json();
        
        authToken = data.token;
        localStorage.setItem('campus_token', authToken);
        
        // --- ACTUALIZACIÓN INMEDIATA DE VARIABLES ---
        const payload = parseJwt(authToken);
        if (payload) {
            currentUserId = payload.id;
            currentUserRole = payload.role; 
        }

        return data; // Devolvemos data completo
    },

    login: async (email, password) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Login fallido');
        }
        const data = await res.json();
        
        authToken = data.token;
        localStorage.setItem('campus_token', authToken);
        
        // --- ACTUALIZACIÓN INMEDIATA DE VARIABLES (FIX PANTALLA GRIS) ---
        const payload = parseJwt(authToken);
        if (payload) {
            currentUserId = payload.id;
            currentUserRole = payload.role; 
        }

        return data; // Devolvemos data completo (coherencia con activate)
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
        if (res.status === 401) { api.logout(); return null; }
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
    registerVisit: async (nodeId) => {
        await fetch(`/api/visit/${nodeId}`, { method: 'POST', headers: getHeaders() });
    },
    getUserStats: async () => {
        const res = await fetch('/api/user-stats', { headers: getHeaders() });
        return res.json();
    },
    getAnnouncement: async () => {
        const res = await fetch('/api/announcement', { headers: getHeaders() });
        return res.json();
    },
    
    // ADMIN
    getAdminUsers: async () => {
        const res = await fetch('/api/admin/users', { headers: getHeaders() });
        return res.json();
    },
    addAdminUsers: async (emailsStr) => {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ emails: emailsStr })
        });
        return res.json();
    },
    deleteUser: async (id) => {
        await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
    adminResetUser: async (id) => {
        await fetch(`/api/admin/users/reset/${id}`, { method: 'POST', headers: getHeaders() });
    },
    updateAnnouncement: async (msg) => {
        await fetch('/api/admin/announcement', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ message: msg })
        });
    },
    getAdminContent: async () => {
        const res = await fetch('/api/admin/content', { headers: getHeaders() });
        return res.json();
    },
    adminDeleteNode: async (id) => {
        await fetch(`/api/admin/nodes/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
    adminDeleteConn: async (id) => {
        await fetch(`/api/admin/connections/${id}`, { method: 'DELETE', headers: getHeaders() });
    },
    adminUpdateNode: async (id, data) => {
        const res = await fetch(`/api/admin/nodes/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error("Error actualizando nodo");
        return res.json();
    },
    adminUpdateConnection: async (id, description) => {
        const res = await fetch(`/api/admin/connections/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ description })
        });
        if (!res.ok) throw new Error("Error actualizando conexión");
        return res.json();
    },

    downloadExport: async (type) => {
        try {
            const res = await fetch(`/api/admin/export/${type}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}` // Sends the JWT
                }
            });
            
            if (!res.ok) throw new Error("Error de autorización o servidor.");

            // Extract filename or default
            let filename = `export_${type}.csv`;
            const disposition = res.headers.get('Content-Disposition');
            if (disposition && disposition.includes('attachment')) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // Create Blob and Download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            alert("Error descargando: " + e.message);
        }
    },

    logout: () => {
        authToken = null;
        currentUserId = null;
        currentUserRole = 'user';
        localStorage.removeItem('campus_token');
        window.location.reload();
    }
};