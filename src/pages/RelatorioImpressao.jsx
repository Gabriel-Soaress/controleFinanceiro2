import React, { useState, useEffect } from 'react';
import styles from '../modules/RelatorioImpressao.module.css';
import { API_BASE_URL } from '../services/api';

const NOMES_MESES = [
    { valor: 1, nome: 'Janeiro' },
    { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' },
    { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' },
    { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' },
    { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' },
    { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' },
    { valor: 12, nome: 'Dezembro' }
];

const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

function formatarMoeda(valor) {
    const num = Number(valor) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarDataBR(dataString) {
    if (!dataString) return '-';
    // Se vier no formato AAAA-MM-DD
    const partes = dataString.split('T')[0].split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
}

function RelatorioImpressao({
    usuarioId,
    anoInicial,
    mesInicial,
    contas = [],
    carteiras = [],
    categorias = [],
    aoVoltar
}) {
    const anoAtualPadrao = new Date().getFullYear();
    const mesAtualPadrao = new Date().getMonth() + 1;

    const [ano, setAno] = useState(anoInicial ? Number(anoInicial) : anoAtualPadrao);
    const [mes, setMes] = useState(mesInicial && mesInicial !== 'TODOS' ? Number(mesInicial) : mesAtualPadrao);
    const [movimentacoes, setMovimentacoes] = useState([]);
    const [carregando, setCarregando] = useState(true);

    // Mapeamento de carteiras e categorias para busca rápida
    const mapaCarteiras = {};
    carteiras.forEach(c => { mapaCarteiras[c.id] = c.nome; });

    const mapaCategorias = {};
    categorias.forEach(cat => { mapaCategorias[cat.id] = cat.nome; });

    // Determinar início e fim da data do mês
    const mesPad = String(mes).padStart(2, '0');
    const ultimoDia = new Date(ano, mes, 0).getDate();
    const dataInicio = `${ano}-${mesPad}-01`;
    const dataFim = `${ano}-${mesPad}-${String(ultimoDia).padStart(2, '0')}`;

    // Buscar movimentações no período selecionado
    useEffect(() => {
        let cancelado = false;

        async function buscarMovimentacoes() {
            if (!usuarioId) return;
            setCarregando(true);
            try {
                const res = await fetch(`${API_BASE_URL}/movimentacoes?inicio=${dataInicio}&fim=${dataFim}`, {
                    headers: { 'user-id': usuarioId }
                });
                if (res.ok) {
                    const dados = await res.json();
                    if (!cancelado) setMovimentacoes(dados);
                }
            } catch (err) {
                console.error("Erro ao buscar movimentações para relatório:", err);
            } finally {
                if (!cancelado) setCarregando(false);
            }
        }

        buscarMovimentacoes();
        return () => { cancelado = true; };
    }, [usuarioId, dataInicio, dataFim]);

    // 1. ENTRADAS: Movimentações do tipo ENTRADA (sem estornos)
    const listaEntradas = movimentacoes.filter(m =>
        m.tipo === 'ENTRADA' &&
        !String(m.descricao || '').toLowerCase().includes('estorno')
    );
    const totalEntradas = listaEntradas.reduce((acc, m) => acc + Number(m.valor || 0), 0);

    // 2. SAÍDAS / CONTAS PAGAS: Contas com status PAGO e data_pagamento no período
    const listaSaidasPagas = contas.filter(c => {
        if (c.status !== 'PAGO') return false;
        const dataPag = c.data_pagamento || c.emissao || c.vencimento;
        return dataPag >= dataInicio && dataPag <= dataFim;
    });
    const totalSaidas = listaSaidasPagas.reduce((acc, c) => acc + Number(c.valor_original || c.valor || 0), 0);

    // 3. CONTAS EM ABERTO / PENDENTES:
    // Contas que NÃO estão pagas e que foram geradas/emitidas neste período
    const listaContasEmAberto = contas.filter(c => {
        if (c.status === 'PAGO') return false;
        const dataRef = c.emissao || c.vencimento;
        return dataRef >= dataInicio && dataRef <= dataFim;
    });
    const totalContasEmAberto = listaContasEmAberto.reduce((acc, c) => acc + Number(c.valor || 0), 0);

    // Resultado Líquido Operacional do Mês
    const saldoLiquidoMes = totalEntradas - totalSaidas;

    // Nome do mês por extenso
    const nomeMesExtenso = NOMES_MESES.find(m => m.valor === mes)?.nome || `Mês ${mes}`;

    // Data de emissão formatada
    const dataHoraEmissao = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const hojeStr = new Date().toISOString().split('T')[0];

    const dispararImpressao = () => {
        window.print();
    };

    return (
        <div className={styles.paginaRelatorio}>
            {/* BARRA DE AÇÕES (NÃO APARECE NA IMPRESSÃO) */}
            <div className={styles.barraAcoes}>
                <div className={styles.grupoAcoesEsquerda}>
                    <button className={styles.botaoVoltar} onClick={aoVoltar} title="Voltar ao Painel">
                        ← Voltar ao Painel
                    </button>

                    <div className={styles.seletorPeriodo}>
                        <span>Mês:</span>
                        <select
                            className={styles.selectFiltro}
                            value={mes}
                            onChange={(e) => setMes(Number(e.target.value))}
                        >
                            {NOMES_MESES.map(m => (
                                <option key={m.valor} value={m.valor}>{m.nome}</option>
                            ))}
                        </select>

                        <span>Ano:</span>
                        <select
                            className={styles.selectFiltro}
                            value={ano}
                            onChange={(e) => setAno(Number(e.target.value))}
                        >
                            {ANOS_DISPONIVEIS.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.grupoAcoesDireita}>
                    <button className={styles.botaoImprimir} onClick={dispararImpressao}>
                        🖨️ Imprimir / Salvar em PDF
                    </button>
                </div>
            </div>

            {/* DOCUMENTO DE IMPRESSÃO (FOLHA BRANCA FORMATO A4) */}
            <div className={styles.folhaDocumento}>
                {/* CABEÇALHO DO RELATÓRIO */}
                <header className={styles.cabecalho}>
                    <div className={styles.marcaSistema}>
                        <span className={styles.nomeSistema}>Sistema de Gestão Financeira</span>
                        <span className={styles.subtituloSistema}>Demonstrativo Mensal Consolidado</span>
                        <h1 className={styles.tituloRelatorio}>Relatório Financeiro</h1>
                        <span className={styles.periodoDestaque}>
                            Competência: <strong>{nomeMesExtenso} de {ano}</strong>
                        </span>
                    </div>

                    <div className={styles.dadosEmissao}>
                        <p><strong>Emissão:</strong> {dataHoraEmissao}</p>
                        <p><strong>Período:</strong> {formatarDataBR(dataInicio)} até {formatarDataBR(dataFim)}</p>
                        <p><strong>Status:</strong> {carregando ? 'Atualizando...' : 'Consolidado'}</p>
                    </div>
                </header>

                {/* 4 CARDS DE RESUMO EXECUTIVO */}
                <section className={styles.gridResumo}>
                    <div className={styles.cardResumo}>
                        <span className={styles.cardLabel}>Total de Entradas</span>
                        <span className={`${styles.cardValor} ${styles.valorEntrada}`}>
                            {formatarMoeda(totalEntradas)}
                        </span>
                    </div>

                    <div className={styles.cardResumo}>
                        <span className={styles.cardLabel}>Total de Saídas</span>
                        <span className={`${styles.cardValor} ${styles.valorSaida}`}>
                            {formatarMoeda(totalSaidas)}
                        </span>
                    </div>

                    <div className={styles.cardResumo}>
                        <span className={styles.cardLabel}>Balanço do Mês</span>
                        <span className={`${styles.cardValor} ${saldoLiquidoMes >= 0 ? styles.valorLiquidoPositivo : styles.valorLiquidoNegativo}`}>
                            {formatarMoeda(saldoLiquidoMes)}
                        </span>
                    </div>

                    <div className={styles.cardResumo}>
                        <span className={styles.cardLabel}>Contas em Aberto</span>
                        <span className={`${styles.cardValor} ${styles.valorPendente}`}>
                            {formatarMoeda(totalContasEmAberto)}
                        </span>
                    </div>
                </section>

                {/* SEÇÃO 1: ENTRADAS DO PERÍODO */}
                <section className={styles.secaoRelatorio}>
                    <div className={styles.cabecalhoSecao}>
                        <h2 className={styles.tituloSecao}>
                            1. Entradas e Receitas do Período
                            <span className={styles.badgeContador}>{listaEntradas.length}</span>
                        </h2>
                        <span className={styles.subtotalCabecalho}>
                            Subtotal: {formatarMoeda(totalEntradas)}
                        </span>
                    </div>

                    {listaEntradas.length === 0 ? (
                        <div className={styles.mensagemVazio}>
                            Nenhuma entrada registrada para o período de {nomeMesExtenso}/{ano}.
                        </div>
                    ) : (
                        <table className={styles.tabelaRelatorio}>
                            <thead>
                                <tr>
                                    <th className={styles.colunaData}>Data</th>
                                    <th>Descrição / Origem</th>
                                    <th>Destino / Carteira</th>
                                    <th className={styles.colunaValor}>Valor (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaEntradas.map((m, idx) => (
                                    <tr key={m.id || idx}>
                                        <td className={styles.colunaData}>{formatarDataBR(m.data_pagamento || m.data)}</td>
                                        <td>{m.descricao || 'Receita / Depósito'}</td>
                                        <td>{mapaCarteiras[m.carteira_id] || 'Caixa Geral'}</td>
                                        <td className={`${styles.colunaValor} ${styles.valorEntrada}`}>
                                            + {formatarMoeda(m.valor)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className={styles.linhaTotal}>
                                    <td colSpan="3" style={{ textAlign: 'right' }}>Total de Entradas:</td>
                                    <td className={`${styles.colunaValor} ${styles.valorEntrada}`}>
                                        {formatarMoeda(totalEntradas)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </section>

                {/* SEÇÃO 2: SAÍDAS / CONTAS PAGAS DO PERÍODO */}
                <section className={styles.secaoRelatorio}>
                    <div className={styles.cabecalhoSecao}>
                        <h2 className={styles.tituloSecao}>
                            2. Saídas e Despesas Pagas
                            <span className={styles.badgeContador}>{listaSaidasPagas.length}</span>
                        </h2>
                        <span className={styles.subtotalCabecalho}>
                            Subtotal: {formatarMoeda(totalSaidas)}
                        </span>
                    </div>

                    {listaSaidasPagas.length === 0 ? (
                        <div className={styles.mensagemVazio}>
                            Nenhuma saída ou conta paga registrada para o período de {nomeMesExtenso}/{ano}.
                        </div>
                    ) : (
                        <table className={styles.tabelaRelatorio}>
                            <thead>
                                <tr>
                                    <th className={styles.colunaData}>Pagamento</th>
                                    <th>Descrição / Conta</th>
                                    <th>Categoria</th>
                                    <th className={styles.colunaData}>Vencimento</th>
                                    <th className={styles.colunaValor}>Valor Pago (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaSaidasPagas.map((c, idx) => (
                                    <tr key={c.id || idx}>
                                        <td className={styles.colunaData}>{formatarDataBR(c.data_pagamento || c.emissao)}</td>
                                        <td>
                                            <strong>{c.nome}</strong>
                                            {c.descricao && <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>{c.descricao}</span>}
                                        </td>
                                        <td>{c.categoria || mapaCategorias[c.categoria_id] || 'Geral'}</td>
                                        <td className={styles.colunaData}>{formatarDataBR(c.vencimento)}</td>
                                        <td className={`${styles.colunaValor} ${styles.valorSaida}`}>
                                            - {formatarMoeda(c.valor_original || c.valor)}
                                        </td>
                                    </tr>
                                ))}
                                <tr className={styles.linhaTotal}>
                                    <td colSpan="4" style={{ textAlign: 'right' }}>Total de Saídas Pagas:</td>
                                    <td className={`${styles.colunaValor} ${styles.valorSaida}`}>
                                        {formatarMoeda(totalSaidas)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </section>

                {/* SEÇÃO 3: CONTAS EM ABERTO / PENDENTES */}
                <section className={styles.secaoRelatorio}>
                    <div className={styles.cabecalhoSecao}>
                        <h2 className={styles.tituloSecao}>
                            3. Contas em Aberto / Pendentes
                            <span className={styles.badgeContador}>{listaContasEmAberto.length}</span>
                        </h2>
                        <span className={styles.subtotalCabecalho}>
                            Total Pendente: {formatarMoeda(totalContasEmAberto)}
                        </span>
                    </div>

                    {listaContasEmAberto.length === 0 ? (
                        <div className={`${styles.mensagemVazio} ${styles.avisoQuitado}`}>
                            ✓ Nenhuma conta pendente para este mês. Todas as contas registradas foram quitadas!
                        </div>
                    ) : (
                        <table className={styles.tabelaRelatorio}>
                            <thead>
                                <tr>
                                    <th className={styles.colunaData}>Vencimento</th>
                                    <th>Descrição / Conta</th>
                                    <th>Categoria</th>
                                    <th style={{ textAlign: 'center', width: '100px' }}>Situação</th>
                                    <th className={styles.colunaValor}>Valor a Pagar (R$)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaContasEmAberto.map((c, idx) => {
                                    const vencimentoStr = c.vencimento ? c.vencimento.split('T')[0] : '';
                                    const vencida = vencimentoStr && vencimentoStr < hojeStr;
                                    return (
                                        <tr key={c.id || idx}>
                                            <td className={styles.colunaData}>{formatarDataBR(c.vencimento)}</td>
                                            <td>
                                                <strong>{c.nome}</strong>
                                                {c.descricao && <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>{c.descricao}</span>}
                                            </td>
                                            <td>{c.categoria || mapaCategorias[c.categoria_id] || 'Geral'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`${styles.statusBadge} ${vencida ? styles.statusVencida : styles.statusAVencer}`}>
                                                    {vencida ? 'Vencida' : 'A Vencer'}
                                                </span>
                                            </td>
                                            <td className={`${styles.colunaValor} ${styles.valorPendente}`}>
                                                {formatarMoeda(c.valor)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className={styles.linhaTotal}>
                                    <td colSpan="4" style={{ textAlign: 'right' }}>Total de Contas em Aberto:</td>
                                    <td className={`${styles.colunaValor} ${styles.valorPendente}`}>
                                        {formatarMoeda(totalContasEmAberto)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </section>

                {/* RODAPÉ DO RELATÓRIO */}
                <footer className={styles.rodapeDocumento}>
                    <span>Documento emitido automaticamente pelo Sistema Financeiro Sofit.</span>
                    <span>Página 1 de 1 &bull; {dataHoraEmissao}</span>
                </footer>
            </div>
        </div>
    );
}

export default RelatorioImpressao;
