const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json());

// Conexão direta com o Neon PostgreSQL (Pooler oficial Serverless)
const connectionString = process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_6NzVDwnrGR0O@ep-noisy-bonus-acp2dct9-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

const router = express.Router();

// --- 1. LOGIN ---
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const resultado = await pool.query(
            'SELECT id, nome, email FROM usuarios WHERE email = $1 AND senha = $2',
            [email, senha]
        );
        if (resultado.rows.length > 0) {
            res.json(resultado.rows[0]);
        } else {
            res.status(401).json({ erro: 'Email ou senha incorretos' });
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// --- 2. CATEGORIAS ---
router.get('/categorias', async (req, res) => {
    try {
        const consulta = await pool.query('SELECT * FROM categorias ORDER BY id ASC');
        res.json(consulta.rows);
    } catch (erro) {
        console.error("Erro ao buscar categorias:", erro);
        res.status(500).json({ mensagem: 'Erro ao buscar categorias' });
    }
});

// --- 3. CONTAS (LISTAR) ---
router.get('/contas', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não identificado' });
    }
    try {
        const consulta = await pool.query(
            'SELECT * FROM contas WHERE usuario_id = $1 ORDER BY id DESC',
            [usuario_id]
        );
        res.json(consulta.rows);
    } catch (erro) {
        console.error("Erro ao buscar contas:", erro);
        res.status(500).json({ mensagem: 'Erro ao buscar contas' });
    }
});

// --- 4. CONTAS (CRIAR) ---
router.post('/contas', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    let { numero_boleto, categoria_id, nome, descricao, valor, emissao, vencimento } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'O nome da conta é obrigatório' });
    }
    if (!valor || isNaN(valor) || Number(valor) <= 0) {
        return res.status(400).json({ erro: 'O valor da conta deve ser maior que zero' });
    }
    if (!vencimento) {
        return res.status(400).json({ erro: 'A data de vencimento é obrigatória' });
    }
    if (!emissao) {
        emissao = new Date().toISOString().split('T')[0];
    }
    const catId = categoria_id ? parseInt(categoria_id) : 1;

    const sql = `
        INSERT INTO contas
            (usuario_id, categoria_id, referencia, nome, descricao, valor, valor_original, data_emissao, data_vencimento, status)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDENTE')
        RETURNING *;
    `;

    try {
        const resultado = await pool.query(sql, [
            usuario_id,
            catId,
            numero_boleto || '',
            nome.trim(),
            descricao || '',
            Number(valor),
            Number(valor),
            emissao,
            vencimento
        ]);
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao criar conta:", erro);
        res.status(500).json({ mensagem: 'Erro ao cadastrar conta' });
    }
});

// --- 5. CONTAS (EDITAR) ---
router.put('/contas/:id', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const idDaConta = req.params.id;
    let { numero_boleto, categoria_id, nome, descricao, valor, emissao, vencimento } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'O nome da conta é obrigatório' });
    }
    if (!valor || isNaN(valor) || Number(valor) <= 0) {
        return res.status(400).json({ erro: 'O valor da conta deve ser maior que zero' });
    }
    if (!vencimento) {
        return res.status(400).json({ erro: 'A data de vencimento é obrigatória' });
    }
    if (!emissao) {
        emissao = new Date().toISOString().split('T')[0];
    }
    const catId = categoria_id ? parseInt(categoria_id) : 1;

    const sql = `
        UPDATE contas SET
            referencia = $1,
            categoria_id = $2,
            nome = $3,
            descricao = $4,
            valor = $5,
            valor_original = $6,
            data_emissao = $7,
            data_vencimento = $8
        WHERE id = $9 AND usuario_id = $10
        RETURNING *;
    `;

    try {
        const contaAtualizada = await pool.query(sql, [
            numero_boleto || '',
            catId,
            nome.trim(),
            descricao || '',
            Number(valor),
            Number(valor),
            emissao,
            vencimento,
            idDaConta,
            usuario_id
        ]);
        if (contaAtualizada.rowCount === 0) {
            return res.status(404).json({ erro: 'Conta não encontrada ou não pertence ao usuário' });
        }
        res.json(contaAtualizada.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar conta:", erro);
        res.status(500).json({ mensagem: 'Erro ao atualizar conta' });
    }
});

// --- 6. CONTAS (DELETAR) ---
router.delete('/contas/:id', async (req, res) => {
    const idDaConta = req.params.id;
    const usuario_id = req.headers['user-id'];

    try {
        await pool.query('DELETE FROM contas WHERE id = $1 AND usuario_id = $2', [idDaConta, usuario_id]);
        res.json({ mensagem: 'Conta deletada com sucesso' });
    } catch (erro) {
        console.error("Erro ao deletar conta:", erro);
        res.status(500).json({ mensagem: 'Erro ao deletar conta' });
    }
});

// --- 7. CARTEIRAS (LISTAR) ---
router.get('/carteiras', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    try {
        const consulta = await pool.query(
            'SELECT * FROM carteiras WHERE usuario_id = $1 ORDER BY id ASC',
            [usuario_id]
        );
        res.json(consulta.rows);
    } catch (erro) {
        console.error("Erro ao buscar carteiras:", erro);
        res.status(500).json({ mensagem: 'Erro ao buscar carteiras' });
    }
});

// --- 8. CARTEIRAS (CRIAR) ---
router.post('/carteiras', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { nome, cor, saldo_inicial } = req.body;

    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'O nome da carteira é obrigatório' });
    }

    const corEscolhida = cor || '#3E615B';
    const saldoInicialNum = parseFloat(saldo_inicial) || 0;

    try {
        const sql = `
            INSERT INTO carteiras (usuario_id, nome, cor, saldo)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const resultado = await pool.query(sql, [usuario_id, nome.trim(), corEscolhida, saldoInicialNum]);
        const novaCarteira = resultado.rows[0];

        if (saldoInicialNum > 0) {
            const dataHoje = new Date().toISOString().split('T')[0];
            await pool.query(
                `INSERT INTO movimentacoes (usuario_id, conta_id, carteira_id, valor, tipo, descricao, data_pagamento)
                 VALUES ($1, null, $2, $3, 'ENTRADA', $4, $5)`,
                [usuario_id, novaCarteira.id, saldoInicialNum, `Saldo inicial - ${nome.trim()}`, dataHoje]
            );
        }

        res.status(201).json(novaCarteira);
    } catch (erro) {
        console.error("Erro ao criar carteira:", erro);
        res.status(500).json({ erro: 'Erro ao cadastrar carteira' });
    }
});

// --- 9. CARTEIRAS (DELETAR) ---
router.delete('/carteiras/:id', async (req, res) => {
    const idCarteira = req.params.id;
    const usuario_id = req.headers['user-id'];

    try {
        const movs = await pool.query(
            'SELECT id FROM movimentacoes WHERE carteira_id = $1 AND usuario_id = $2 LIMIT 1',
            [idCarteira, usuario_id]
        );
        if (movs.rows.length > 0) {
            return res.status(400).json({ erro: 'Não é possível excluir uma carteira que possui movimentações vinculadas.' });
        }

        const del = await pool.query(
            'DELETE FROM carteiras WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [idCarteira, usuario_id]
        );
        if (del.rowCount === 0) {
            return res.status(404).json({ erro: 'Carteira não encontrada.' });
        }
        res.json({ mensagem: 'Carteira excluída com sucesso!' });
    } catch (erro) {
        console.error("Erro ao deletar carteira:", erro);
        res.status(500).json({ erro: 'Erro ao excluir carteira' });
    }
});

// --- 10. ADICIONAR SALDO (ENTRADA) ---
router.post('/movimentacoes/entrada', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { carteira_id, valor, data, descricao } = req.body;

    try {
        await pool.query(
            'UPDATE carteiras SET saldo = saldo + $1 WHERE id = $2 AND usuario_id = $3',
            [valor, carteira_id, usuario_id]
        );

        const sqlMov = `
            INSERT INTO movimentacoes (usuario_id, conta_id, carteira_id, valor, tipo, descricao, data_pagamento)
            VALUES ($1, null, $2, $3, 'ENTRADA', $4, $5)
        `;
        await pool.query(sqlMov, [usuario_id, carteira_id, valor, descricao, data]);

        res.json({ mensagem: "Depósito realizado com sucesso!" });
    } catch (erro) {
        console.error("Erro no depósito:", erro);
        res.status(500).json({ erro: "Erro ao adicionar saldo" });
    }
});

// --- 11. PAGAR CONTA ---
router.post('/contas/pagar', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { conta_id, carteira_id, valor, natureza, data_pagamento } = req.body;

    try {
        if (natureza === 'TOTAL') {
            await pool.query(
                "UPDATE contas SET status = 'PAGO', valor = 0, data_pagamento = $1 WHERE id = $2 AND usuario_id = $3",
                [data_pagamento, conta_id, usuario_id]
            );
        } else {
            await pool.query(
                "UPDATE contas SET valor = valor - $1, status = 'PARCIAL', data_pagamento = $2 WHERE id = $3 AND usuario_id = $4",
                [valor, data_pagamento, conta_id, usuario_id]
            );
        }

        await pool.query(
            'UPDATE carteiras SET saldo = saldo - $1 WHERE id = $2 AND usuario_id = $3',
            [valor, carteira_id, usuario_id]
        );

        const sqlMov = `
            INSERT INTO movimentacoes (usuario_id, conta_id, carteira_id, valor, tipo, descricao, data_pagamento)
            VALUES ($1, $2, $3, $4, 'SAIDA', $5, $6)
        `;
        await pool.query(sqlMov, [usuario_id, conta_id, carteira_id, valor, `Pagamento ${natureza}`, data_pagamento]);

        res.json({ mensagem: "Pagamento processado com sucesso!" });
    } catch (erro) {
        console.error("Erro no pagamento:", erro);
        res.status(500).json({ erro: "Erro no processamento do pagamento" });
    }
});

// --- 12. ESTORNAR CONTA ---
router.post('/contas/estornar', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { conta_id } = req.body;

    try {
        const buscaMov = await pool.query(
            `SELECT carteira_id, valor FROM movimentacoes 
             WHERE conta_id = $1 AND tipo = 'SAIDA' AND usuario_id = $2
             ORDER BY id DESC LIMIT 1`,
            [conta_id, usuario_id]
        );

        if (buscaMov.rows.length === 0) {
            return res.status(404).json({ erro: "Histórico de pagamento não encontrado" });
        }

        const { carteira_id, valor } = buscaMov.rows[0];

        await pool.query('UPDATE carteiras SET saldo = saldo + $1 WHERE id = $2 AND usuario_id = $3', [valor, carteira_id, usuario_id]);
        await pool.query("UPDATE contas SET status = 'PENDENTE', valor = valor_original, data_pagamento = null WHERE id = $1 AND usuario_id = $2", [conta_id, usuario_id]);

        await pool.query(
            `INSERT INTO movimentacoes (usuario_id, conta_id, carteira_id, valor, tipo, descricao, data_pagamento)
             VALUES ($1, $2, $3, $4, 'ENTRADA', 'Estorno de Pagamento', NOW())`,
            [usuario_id, conta_id, carteira_id, valor]
        );

        res.json({ mensagem: "Estorno realizado com sucesso!" });
    } catch (erro) {
        console.error("Erro ao estornar:", erro);
        res.status(500).json({ erro: "Erro ao estornar conta" });
    }
});

// --- 13. MOVIMENTAÇÕES (RESUMO) ---
router.get('/movimentacoes', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { inicio, fim } = req.query;

    try {
        const sql = `
            SELECT * FROM movimentacoes 
            WHERE usuario_id = $1 
            AND data_pagamento BETWEEN $2 AND $3
            ORDER BY data_pagamento ASC
        `;
        const consulta = await pool.query(sql, [usuario_id, inicio, fim]);
        res.json(consulta.rows);
    } catch (erro) {
        console.error("Erro ao buscar movimentações:", erro);
        res.status(500).json({ erro: 'Erro ao buscar resumo de movimentações' });
    }
});

// --- 14. CONTATOS (LISTAR) ---
router.get('/contatos', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não identificado' });
    }
    const { tipo, busca } = req.query;
    try {
        let sql = 'SELECT * FROM contatos WHERE usuario_id = $1';
        const params = [usuario_id];

        if (tipo && tipo !== 'todos') {
            params.push(tipo);
            sql += ` AND tipo = $${params.length}`;
        }

        if (busca && busca.trim()) {
            params.push(`%${busca.trim()}%`);
            sql += ` AND (nome ILIKE $${params.length} OR chave_pix ILIKE $${params.length})`;
        }

        sql += ' ORDER BY nome ASC';
        const consulta = await pool.query(sql, params);
        res.json(consulta.rows);
    } catch (erro) {
        console.error("Erro ao buscar contatos:", erro);
        res.status(500).json({ mensagem: 'Erro ao buscar contatos' });
    }
});

// --- 15. CONTATOS (CRIAR) ---
router.post('/contatos', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não identificado' });
    }
    const { nome, chave_pix, tipo } = req.body;
    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'O nome do contato é obrigatório' });
    }
    const tipoValido = ['fornecedor', 'funcionario', 'terceirizado'].includes(tipo) ? tipo : 'fornecedor';
    try {
        const resultado = await pool.query(
            `INSERT INTO contatos (usuario_id, nome, chave_pix, tipo)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [usuario_id, nome.trim(), chave_pix ? chave_pix.trim() : '', tipoValido]
        );
        res.status(201).json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao criar contato:", erro);
        res.status(500).json({ mensagem: 'Erro ao cadastrar contato' });
    }
});

// --- 16. CONTATOS (EDITAR) ---
router.put('/contatos/:id', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { id } = req.params;
    const { nome, chave_pix, tipo } = req.body;
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não identificado' });
    }
    if (!nome || !nome.trim()) {
        return res.status(400).json({ erro: 'O nome do contato é obrigatório' });
    }
    const tipoValido = ['fornecedor', 'funcionario', 'terceirizado'].includes(tipo) ? tipo : 'fornecedor';
    try {
        const resultado = await pool.query(
            `UPDATE contatos
             SET nome = $1, chave_pix = $2, tipo = $3
             WHERE id = $4 AND usuario_id = $5
             RETURNING *`,
            [nome.trim(), chave_pix ? chave_pix.trim() : '', tipoValido, id, usuario_id]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Contato não encontrado' });
        }
        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error("Erro ao atualizar contato:", erro);
        res.status(500).json({ mensagem: 'Erro ao atualizar contato' });
    }
});

// --- 17. CONTATOS (DELETAR) ---
router.delete('/contatos/:id', async (req, res) => {
    const usuario_id = req.headers['user-id'];
    const { id } = req.params;
    if (!usuario_id) {
        return res.status(401).json({ erro: 'Usuário não identificado' });
    }
    try {
        const resultado = await pool.query(
            'DELETE FROM contatos WHERE id = $1 AND usuario_id = $2',
            [id, usuario_id]
        );
        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Contato não encontrado' });
        }
        res.json({ mensagem: 'Contato excluído com sucesso' });
    } catch (erro) {
        console.error("Erro ao excluir contato:", erro);
        res.status(500).json({ mensagem: 'Erro ao excluir contato' });
    }
});

// Rota de Healthcheck
router.get('/health', (req, res) => {
    res.json({ status: 'ok', server: 'Vercel Serverless + Neon PostgreSQL' });
});

// Suporte tanto com prefixo /api quanto sem
app.use('/api', router);
app.use('/', router);

module.exports = app;
