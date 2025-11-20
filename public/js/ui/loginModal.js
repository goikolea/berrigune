// js/ui/loginModal.js
import { api } from '../services/api.js';

const styles = `
    #login-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #F5F5F7; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
    }
    .login-box {
        background: white; padding: 40px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 320px;
        text-align: center; font-family: 'Segoe UI', sans-serif;
    }
    .login-title { font-size: 24px; font-weight: 800; margin-bottom: 20px; color: #1a1a1a; }
    .login-input {
        width: 100%; padding: 12px; margin-bottom: 15px;
        border: 2px solid #eee; border-radius: 6px; box-sizing: border-box;
        font-size: 16px; transition: border 0.2s;
    }
    .login-input:focus { border-color: #4A90E2; outline: none; }
    .login-btn {
        width: 100%; padding: 12px; background: #1a1a1a; color: white;
        border: none; border-radius: 6px; font-size: 16px; font-weight: bold;
        cursor: pointer; transition: transform 0.1s;
    }
    .login-btn:hover { background: #333; }
    .error-msg { color: #E04F5F; font-size: 14px; margin-top: 10px; display: none; }
`;

export function initLogin(onSuccess) {
    // Si ya tenemos token, probamos a entrar directo
    if (api.isLoggedIn()) {
        onSuccess();
        return;
    }

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-box">
            <h1 class="login-title">Campus Innovación</h1>
            <input type="email" id="email" class="login-input" placeholder="Email del Centro">
            <input type="password" id="code" class="login-input" placeholder="Código de Acceso">
            <button id="btn-login" class="login-btn">Entrar</button>
            <p id="login-error" class="error-msg">Credenciales incorrectas</p>
        </div>
    `;
    document.body.appendChild(overlay);

    const handleLogin = async () => {
        const email = document.getElementById('email').value;
        const code = document.getElementById('code').value;
        const errorMsg = document.getElementById('login-error');

        try {
            await api.login(email, code);
            overlay.remove(); // Quitamos login
            onSuccess(); // Iniciamos juego
        } catch (e) {
            errorMsg.style.display = 'block';
            errorMsg.innerText = e.message || "Error de acceso";
        }
    };

    document.getElementById('btn-login').onclick = handleLogin;
}