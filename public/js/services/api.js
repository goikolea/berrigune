// js/services/api.js

let authToken = localStorage.getItem('campus_token'); // Recuperar si existe

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
});

export const api = {
    isLoggedIn: () => !!authToken,

    login: async (email, code) => {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        if (!res.ok) throw new Error('Login fallido');
        
        const data = await res.json();
        authToken = data.token;
        localStorage.setItem('campus_token', authToken);
        return data.user;
    },

    getCategories: async () => {
        const res = await fetch('/api/categories', { headers: getHeaders() });
        return res.json();
    },
    
    // NUEVO: Pedir las formas disponibles
    getSignalTypes: async () => {
        const res = await fetch('/api/signal-types', { headers: getHeaders() });
        return res.json();
    },

    getNodes: async () => {
        const res = await fetch('/api/nodes', { headers: getHeaders() });
        if (res.status === 401) return null; // Token caducado
        return res.json();
    },

    createNode: async (nodeData) => {
        const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(nodeData)
        });
        if (!res.ok) throw new Error('Error guardando nodo');
        return res.json(); // Devuelve el nodo COMPLETO con color y forma
    },
    
    logout: () => {
        authToken = null;
        localStorage.removeItem('campus_token');
        window.location.reload();
    }
};