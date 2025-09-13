// Simple client-side login for admin panel
// Note: This is intentionally minimal. For production, use server-side auth.

const TOKEN_KEY = 'tempbot_admin_token';

function saveToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

async function doLogin(username, password) {
    // For now use a simple static check to avoid server changes.
    // Assumption: admin username 'admin' and password 'joana@bot' (kept from existing code)
    if ((username === 'admin' && password === 'joana@bot') ||
        (username === 'helder@joanabot.co.mz' && password === 'helder@joanabot')
    ) {
        // create a simple token (not secure)
        const token = btoa(JSON.stringify({ u: username, t: Date.now() }));
        saveToken(token);
        return { success: true };
    }

    // Try server-side login if endpoint exists
    try {
        const resp = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (resp.ok) {
            const data = await resp.json();
            if (data && data.token) {
                saveToken(data.token);
                return { success: true };
            }
        }
    } catch (e) {
        // ignore
    }

    return { success: false, error: 'Credenciais inválidas' };
}

// Form handling
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const err = document.getElementById('loginError');

    form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        err.style.display = 'none';

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        const result = await doLogin(username, password);
        if (result.success) {
            // Redirect to admin root route (server serves /admin)
            window.location.href = '/admin';
        } else {
            err.textContent = result.error || 'Erro ao autenticar';
            err.style.display = 'block';
        }
    });
});
