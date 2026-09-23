// Configuração centralizada da URL da API
// Na Vercel, '/api' chama a Serverless Function no mesmo domínio (zero CORS e ultra rápido)
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export default API_BASE_URL;
