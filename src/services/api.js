// Configuração centralizada da URL da API
// Na Vercel, '/api' chama a Serverless Function no mesmo domínio (zero CORS e ultra rápido)
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export async function apiGet(endpoint, usuarioId) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'user-id': usuarioId }
    });
    if (!res.ok) throw new Error(`Erro GET ${endpoint}: ${res.statusText}`);
    return res.json();
}

export async function apiPost(endpoint, body, usuarioId) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'user-id': usuarioId
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Erro POST ${endpoint}: ${res.statusText}`);
    return res.json();
}

export async function apiPut(endpoint, body, usuarioId) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'user-id': usuarioId
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Erro PUT ${endpoint}: ${res.statusText}`);
    return res.json();
}

export async function apiDelete(endpoint, usuarioId) {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: { 'user-id': usuarioId }
    });
    if (!res.ok) throw new Error(`Erro DELETE ${endpoint}: ${res.statusText}`);
    return res.json();
}

export default API_BASE_URL;
