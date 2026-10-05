import { useState } from 'react';
import styles from '../../modules/ModalAdicionarSaldo.module.css';

function ModalAdicionarSaldo({ aoFechar, aoSalvar, carteiras = [] }) {
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
    const [origem, setOrigem] = useState(''); // ID da carteira
    const [salvando, setSalvando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const confirmarAdicao = async () => {
        const valorNum = parseFloat(valor);
        if (isNaN(valorNum) || valorNum <= 0) {
            setMensagemErro('Informe um valor válido maior que zero.');
            return;
        }

        if (!origem) {
            setMensagemErro('Selecione a carteira de destino.');
            return;
        }

        const dadosParaEnviar = {
            valor: valorNum,
            descricao: descricao.trim() || 'Entrada de saldo',
            carteira_id: parseInt(origem),
            data: dataEntrada,
            data_pagamento: dataEntrada
        };

        try {
            setSalvando(true);
            setMensagemErro('');
            await aoSalvar(dadosParaEnviar);
            aoFechar();
        } catch (erro) {
            console.error("Erro no modal ao salvar:", erro);
            setMensagemErro(erro.message || 'Não foi possível registrar a entrada. Tente novamente.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalBox}>
                <button className={styles.botaoFechar} onClick={aoFechar} disabled={salvando}>×</button>

                <h2 className={styles.titulo}>Adicionar ao Caixa</h2>

                {/* 1. Valor e Data */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                    <div className={styles.grupoInput} style={{ flex: 1 }}>
                        <label>Valor da Entrada (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            className={styles.inputModal}
                            placeholder="0,00"
                            autoFocus
                            value={valor}
                            disabled={salvando}
                            onChange={(e) => {
                                setValor(e.target.value);
                                if (mensagemErro) setMensagemErro('');
                            }}
                        />
                    </div>

                    <div className={styles.grupoInput} style={{ flex: 1 }}>
                        <label>Data</label>
                        <input
                            type="date"
                            className={styles.inputModal}
                            value={dataEntrada}
                            disabled={salvando}
                            onChange={(e) => setDataEntrada(e.target.value)}
                        />
                    </div>
                </div>

                {/* 2. Origem (Select das Carteiras) */}
                <div className={styles.grupoInput} style={{ marginBottom: '15px' }}>
                    <label>Origem (Onde o dinheiro entrou?)</label>
                    <select
                        className={styles.inputModal}
                        value={origem}
                        disabled={salvando}
                        onChange={(e) => {
                            setOrigem(e.target.value);
                            if (mensagemErro) setMensagemErro('');
                        }}
                    >
                        <option value="">Selecione a carteira...</option>
                        {carteiras.map(cart => (
                            <option key={cart.id} value={cart.id}>{cart.nome}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Descrição */}
                <div className={styles.grupoInput}>
                    <label>Descrição</label>
                    <input
                        type="text"
                        className={styles.inputModal}
                        placeholder="Ex: Venda de balcão, Pix cliente..."
                        value={descricao}
                        disabled={salvando}
                        onChange={(e) => setDescricao(e.target.value)}
                    />
                </div>

                {mensagemErro && (
                    <div style={{
                        marginTop: '12px',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '0.85rem',
                        textAlign: 'center'
                    }}>
                        {mensagemErro}
                    </div>
                )}

                <button
                    className={styles.botaoConfirmar}
                    style={{ marginTop: '20px' }}
                    onClick={confirmarAdicao}
                    disabled={!valor || !origem || salvando}
                >
                    {salvando ? 'REGISTRANDO...' : 'REGISTRAR ENTRADA'}
                </button>
            </div>
        </div>
    );
}

export default ModalAdicionarSaldo;