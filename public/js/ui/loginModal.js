import { api } from '../services/api.js';

const styles = `
    #login-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #F5F5F7; z-index: 9999;
        display: flex; align-items: center; justify-content: center;
    }
    .login-box {
        background: white; padding: 40px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 360px;
        font-family: 'Segoe UI', sans-serif;
        transition: height 0.3s;
    }
    .login-header { text-align: center; margin-bottom: 30px; }
    .login-title { font-size: 24px; font-weight: 800; color: #1a1a1a; margin: 0; }
    .login-subtitle { font-size: 14px; color: #666; margin-top: 5px; }

    /* INPUT GRUPOS */
    .input-group { margin-bottom: 15px; }
    .label { display: block; font-size: 12px; font-weight: 700; margin-bottom: 5px; color: #444; }
    
    /* EMAIL INPUT CON DOMINIO FIJO */
    .email-wrapper { display: flex; align-items: center; border: 2px solid #eee; border-radius: 6px; overflow: hidden; }
    .email-wrapper:focus-within { border-color: #4A90E2; }
    .email-input { 
        flex: 1; border: none; padding: 12px; font-size: 16px; outline: none; 
        text-align: right; background: transparent;
    }
    .domain-suffix {
        background: #f9f9f9; padding: 12px; font-size: 16px; color: #666;
        border-left: 1px solid #eee; font-weight: 600; user-select: none;
    }

    .login-input {
        width: 100%; padding: 12px; border: 2px solid #eee; border-radius: 6px; 
        box-sizing: border-box; font-size: 16px; outline: none; transition: 0.2s;
    }
    .login-input:focus { border-color: #4A90E2; }

    .action-btn {
        width: 100%; padding: 14px; background: #1a1a1a; color: white;
        border: none; border-radius: 6px; font-size: 16px; font-weight: bold;
        cursor: pointer; margin-top: 10px; transition: 0.2s;
    }
    .action-btn:hover { background: #333; }
    .btn-secondary { background: #fff; color: #666; border: 2px solid #eee; margin-top: 10px; }
    .btn-secondary:hover { background: #f5f5f5; color: #333; }

    .error-msg { color: #E04F5F; font-size: 13px; margin-top: 15px; text-align: center; display: none; }
    
    /* PASOS */
    .step { display: none; animation: fadeIn 0.3s; }
    .step.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
`;

let currentDomain = "@...";
let fullEmail = "";

export async function initLogin(onSuccess) {
    // 1. Check sesión
    if (api.isLoggedIn()) {
        const role = api.isAdmin() ? 'admin' : 'user';
        onSuccess({ role });
        return;
    }

    // 2. Obtener Dominio del servidor
    try {
        const config = await api.getPublicConfig();
        currentDomain = "@" + config.domain;
    } catch (e) { console.error("Error config", e); }

    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    const overlay = document.createElement('div');
    overlay.id = 'login-overlay';
    overlay.innerHTML = `
        <div class="login-box">
            <div class="login-header">
                <h1 class="login-title">Campus Innovación</h1>
                <div class="login-subtitle" id="step-title">Identifícate para entrar</div>
            </div>

            <!-- PASO 1: EMAIL -->
            <div id="step-1" class="step active">
                <div class="input-group">
                    <label class="label">USUARIO</label>
                    <div class="email-wrapper">
                        <input type="text" id="inp-username" class="email-input" placeholder="erabiltzailea" autofocus>
                        <div class="domain-suffix">${currentDomain}</div>
                    </div>
                </div>
                <button id="btn-next" class="action-btn">Siguiente</button>
            </div>

            <!-- PASO 2: LOGIN (Contraseña) -->
            <div id="step-login" class="step">
                <div class="input-group">
                    <label class="label">CONTRASEÑA</label>
                    <input type="password" id="inp-password" class="login-input" placeholder="••••••••">
                </div>
                <button id="btn-do-login" class="action-btn">Entrar</button>
                <button class="action-btn btn-secondary btn-back">Atrás</button>
            </div>

            <!-- PASO 2: ACTIVAR (Código + Nueva Pass) -->
            <div id="step-activate" class="step">
                <p style="font-size:13px; color:#666; margin-bottom:15px; line-height:1.4">
                    👋 ¡Bienvenido! Esta es tu primera vez.<br>Activa tu cuenta para continuar.
                </p>
                <div class="input-group">
                    <label class="label">CÓDIGO DE CENTRO</label>
                    <input type="password" id="inp-code" class="login-input" placeholder="Código compartido">
                </div>
                <div class="input-group">
                    <label class="label">CREA TU CONTRASEÑA</label>
                    <input type="password" id="inp-new-pass" class="login-input" placeholder="Mínimo 4 caracteres">
                </div>
                <button id="btn-do-activate" class="action-btn" style="background:#4A90E2">Activar Cuenta</button>
                <button class="action-btn btn-secondary btn-back">Atrás</button>
            </div>

            <div id="error-msg" class="error-msg"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const ui = {
        step1: document.getElementById('step-1'),
        stepLogin: document.getElementById('step-login'),
        stepActivate: document.getElementById('step-activate'),
        title: document.getElementById('step-title'),
        error: document.getElementById('error-msg'),
        username: document.getElementById('inp-username')
    };

    // --- LÓGICA PASO 1 ---
    const handleNext = async () => {
        const username = ui.username.value.trim();
        if (!username) return showError("Escribe tu usuario");

        fullEmail = username + currentDomain; // Construir email completo
        showError(""); // Limpiar errores

        try {
            document.getElementById('btn-next').innerText = "Verificando...";
            const res = await api.checkUserStatus(fullEmail);
            document.getElementById('btn-next').innerText = "Siguiente";

            if (res.status === 'unknown') {
                showError("Usuario no autorizado. Contacta al Master.");
            } else if (res.status === 'active') {
                // IR A LOGIN
                goToStep('login');
            } else if (res.status === 'pending') {
                // IR A ACTIVAR
                goToStep('activate');
            }
        } catch (e) {
            showError("Error de conexión");
            document.getElementById('btn-next').innerText = "Siguiente";
        }
    };

    document.getElementById('btn-next').onclick = handleNext;
    ui.username.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleNext(); });

    // --- LÓGICA LOGIN ---
    document.getElementById('btn-do-login').onclick = async () => {
        const pass = document.getElementById('inp-password').value;
        try {
            const res = await api.login(fullEmail, pass);
            overlay.remove();
            onSuccess(res.user);
        } catch (e) { showError(e.message); }
    };

    // --- LÓGICA ACTIVAR ---
    document.getElementById('btn-do-activate').onclick = async () => {
        const code = document.getElementById('inp-code').value;
        const pass = document.getElementById('inp-new-pass').value;
        
        if (pass.length < 4) return showError("La contraseña es muy corta");

        try {
            const res = await api.activate(fullEmail, code, pass);
            alert("¡Cuenta activada! Bienvenido.");
            overlay.remove();
            onSuccess(res.user);
        } catch (e) { showError(e.message); }
    };

    // --- UTILIDADES ---
    
    // Botones Atrás
    overlay.querySelectorAll('.btn-back').forEach(btn => {
        btn.onclick = () => {
            goToStep('1');
            ui.error.style.display = 'none';
            ui.username.focus();
        };
    });

    function goToStep(stepName) {
        ui.step1.classList.remove('active');
        ui.stepLogin.classList.remove('active');
        ui.stepActivate.classList.remove('active');
        ui.error.style.display = 'none';

        if (stepName === '1') {
            ui.step1.classList.add('active');
            ui.title.innerText = "Identifícate para entrar";
        } else if (stepName === 'login') {
            ui.stepLogin.classList.add('active');
            ui.title.innerText = "Hola de nuevo 👋";
            setTimeout(() => document.getElementById('inp-password').focus(), 100);
        } else if (stepName === 'activate') {
            ui.stepActivate.classList.add('active');
            ui.title.innerText = "Configura tu cuenta 🚀";
            setTimeout(() => document.getElementById('inp-code').focus(), 100);
        }
    }

    function showError(msg) {
        if (!msg) {
            ui.error.style.display = 'none';
        } else {
            ui.error.innerText = msg;
            ui.error.style.display = 'block';
        }
    }
}