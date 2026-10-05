import { useState, useMemo } from 'react';
import styles from '../../modules/ModalAdicionarSaldo.module.css';

function parseValorBR(str) {
    if (typeof str === 'number') return str;
    if (!str) return NaN;
    let limpo = String(str).trim();
    // Se tiver formato tipo 1.500,50
    if (limpo.includes('.') && limpo.includes(',')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    } else if (limpo.includes(',')) {
        limpo = limpo.replace(',', '.');
    }
    return parseFloat(limpo);
}

const formatarBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function ModalAdicionarSaldo({ aoFechar, aoSalvar, aoAjustarSaldo, carteiras = [] }) {
    const [modo, setModo] = useState('ajuste'); // Padrão 'ajuste' para ajudar o usuário a corrigir o saldo negativo
    const [valorEntrada, setValorEntrada] = useState('');
    const [novoSaldo, setNovoSaldo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataEntrada, setDataEntrada] = useState(new Date().toISOString().split('T')[0]);
    const [origem, setOrigem] = useState(carteiras.length > 0 ? String(carteiras[0].id) : '');
    const [salvando, setSalvando] = useState(false);
    const [mensagemErro, setMensagemErro] = useState('');

    const carteiraSelecionada = useMemo(() => {
        return carteiras.find(c => String(c.id) === String(origem)) || null;
    }, [carteiras, origem]);

    const saldoAtual = carteiraSelecionada ? parseFloat(carteiraSelecionada.saldo) || 0 : 0;

    const lidarComConfirmar = async () => {
        if (!origem) {
            setMensagemErro('Selecione uma carteira.');
            return;
        }

        try {
            setSalvando(true);
            setMensagemErro('');

            if (modo === 'entrada') {
                const valorNum = parseValorBR(valorEntrada);
                if (isNaN(valorNum) || valorNum <= 0) {
                    setMensagemErro('Informe um valor de entrada válido maior que zero.');
                    setSalvando(false);
                    return;
                }

                const dados = {
                    valor: valorNum,
                    descricao: descricao.trim() || 'Entrada de saldo',
                    carteira_id: parseInt(origem),
                    data: dataEntrada,
                    data_pagamento: dataEntrada
                };

                await aoSalvar(dados);
            } else {
                // Modo AJUSTAR SALDO REAL
                const saldoNum = parseValorBR(novoSaldo);
                if (isNaN(saldoNum)) {
                    setMensagemErro('Informe o saldo desejado (ex: 0,00 ou o saldo real do banco).');
                    setSalvando(false);
                    return;
                }

                if (!aoAjustarSaldo) {
                    throw new Error('Função de ajuste não disponível.');
                }

                const dados = {
                    carteira_id: parseInt(origem),
                    novo_saldo: saldoNum,
                    data: dataEntrada,
                    data_pagamento: dataEntrada,
                    motivo: descricao.trim() || (saldoNum === 0 ? 'Zeramento de saldo' : 'Ajuste de saldo real')
                };

                await aoAjustarSaldo(dados);
            }

            aoFechar();
        } catch (erro) {
            console.error("Erro no modal de saldo:", erro);
            setMensagemErro(erro.message || 'Erro ao processar a operação. Verifique os dados.');
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalBox}>
                <button className={styles.botaoFechar} onClick={aoFechar} disabled={salvando}>×</button>

                <h2 className={styles.titulo}>Gerenciar Saldo</h2>

                {/* ABAS: ENTRADA VS AJUSTE */}
                <div className={styles.abasModo}>
                    <button
                        type="button"
                        className={`${styles.abaBotao} ${modo === 'ajuste' ? styles.abaAtiva : ''}`}
                        onClick={() => {
                            setModo('ajuste');
                            setMensagemErro('');
                        }}
                    >
                        <i className="fa-solid fa-sliders"></i>
                        Ajustar / Zerar Saldo
                    </button>
                    <button
                        type="button"
                        className={`${styles.abaBotao} ${modo === 'entrada' ? styles.abaAtiva : ''}`}
                        onClick={() => {
                            setModo('entrada');
                            setMensagemErro('');
                        }}
                    >
                        <i className="fa-solid fa-plus"></i>
                        Nova Entrada (+)
                    </button>
                </div>

                {/* 1. SELETOR DE CARTEIRA */}
                <div className={styles.grupoInput}>
                    <label>Carteira</label>
                    <select
                        className={styles.inputModal}
                        value={origem}
                        disabled={salvando}
                        onChange={(e) => {
                            setOrigem(e.target.value);
                            if (mensagemErro) setMensagemErro('');
                        }}
                    >
                        {carteiras.map(cart => (
                            <option key={cart.id} value={cart.id}>
                                {cart.nome} ({formatarBRL(cart.saldo)})
                            </option>
                        ))}
                    </select>
                </div>

                {/* CARD DE SALDO ATUAL DA CARTEIRA SELECIONADA */}
                {carteiraSelecionada && (
                    <div className={styles.cardSaldoAtual}>
                        <span className={styles.labelSaldoAtual}>Saldo Atual da Carteira:</span>
                        <span className={saldoAtual >= 0 ? styles.valorSaldoAtualPositivo : styles.valorSaldoAtualNegativo}>
                            {formatarBRL(saldoAtual)}
                        </span>
                    </div>
                )}

                {/* CONTEÚDO DA ABA: AJUSTAR SALDO REAL */}
                {modo === 'ajuste' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>
                                Definir Saldo Real (R$)
                            </label>
                            <button
                                type="button"
                                className={styles.btnZerarRapido}
                                onClick={() => {
                                    setNovoSaldo('0,00');
                                    if (mensagemErro) setMensagemErro('');
                                }}
                                title="Define o saldo desta carteira exatamente para zero"
                            >
                                <i className="fa-solid fa-rotate-left"></i> Zerar (R$ 0,00)
                            </button>
                        </div>

                        <div className={styles.grupoInput} style={{ marginBottom: '15px' }}>
                            <input
                                type="text"
                                className={styles.inputModal}
                                placeholder="0,00"
                                autoFocus
                                value={novoSaldo}
                                disabled={salvando}
                                onChange={(e) => {
                                    setNovoSaldo(e.target.value);
                                    if (mensagemErro) setMensagemErro('');
                                }}
                            />
                            {novoSaldo !== '' && !isNaN(parseValorBR(novoSaldo)) && (
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                                    Diferença a ajustar:{' '}
                                    <b style={{ color: (parseValorBR(novoSaldo) - saldoAtual) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {(parseValorBR(novoSaldo) - saldoAtual) >= 0 ? '+' : ''}
                                        {formatarBRL(parseValorBR(novoSaldo) - saldoAtual)}
                                    </b>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* CONTEÚDO DA ABA: ADICIONAR ENTRADA */}
                {modo === 'entrada' && (
                    <div className={styles.grupoInput} style={{ marginBottom: '15px' }}>
                        <label>Valor da Entrada (+ R$)</label>
                        <input
                            type="text"
                            className={styles.inputModal}
                            placeholder="0,00"
                            autoFocus
                            value={valorEntrada}
                            disabled={salvando}
                            onChange={(e) => {
                                setValorEntrada(e.target.value);
                                if (mensagemErro) setMensagemErro('');
                            }}
                        />
                        {valorEntrada !== '' && !isNaN(parseValorBR(valorEntrada)) && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                                Saldo projetado: <b>{formatarBRL(saldoAtual + parseValorBR(valorEntrada))}</b>
                            </div>
                        )}
                    </div>
                )}

                {/* DATA */}
                <div className={styles.grupoInput} style={{ marginBottom: '15px' }}>
                    <label>Data</label>
                    <input
                        type="date"
                        className={styles.inputModal}
                        value={dataEntrada}
                        disabled={salvando}
                        onChange={(e) => setDataEntrada(e.target.value)}
                    />
                </div>

                {/* DESCRIÇÃO OPCIONAL */}
                <div className={styles.grupoInput} style={{ marginBottom: '15px' }}>
                    <label>Motivo / Descrição</label>
                    <input
                        type="text"
                        className={styles.inputModal}
                        placeholder={modo === 'ajuste' ? "Ex: Correção de saldo, Zeramento..." : "Ex: Venda, Depósito, Pix..."}
                        value={descricao}
                        disabled={salvando}
                        onChange={(e) => setDescricao(e.target.value)}
                    />
                </div>

                {mensagemErro && (
                    <div style={{
                        marginBottom: '15px',
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
                    onClick={lidarComConfirmar}
                    disabled={salvando || !origem || (modo === 'entrada' ? !valorEntrada : novoSaldo === '')}
                >
                    {salvando
                        ? 'PROCESSANDO...'
                        : modo === 'ajuste'
                            ? 'CONFIRMAR AJUSTE DE SALDO'
                            : 'REGISTRAR ENTRADA'
                    }
                </button>
            </div>
        </div>
    );
}

export default ModalAdicionarSaldo;