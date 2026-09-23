const app = require('./api/index');
const PORT = process.env.PORT || 3333;

const server = app.listen(PORT, () => {
    console.log(`🚀 API rodando localmente em http://localhost:${PORT}`);
});

// Manter processo ativo no Windows
setInterval(() => {}, 10000);
