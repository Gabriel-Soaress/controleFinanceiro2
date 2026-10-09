import React, { useState } from 'react';
import styles from '../modules/TabelaContas.module.css';
import ModalMensagem from './modais/ModalMensagem';
import ModalSelecionarContato from './modais/ModalSelecionarContato';

const PALETA_CORES = [
    { cor: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' },
    { cor: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.35)' },
    { cor: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' },
    { cor: '#a78bfa', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.35)' },
    { cor: '#f472b6', bg: 'rgba(244, 114, 182, 0.15)', border: 'rgba(244, 114, 182, 0.35)' },
    { cor: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)', border: 'rgba(34, 211, 238, 0.35)' },
    { cor: '#facc15', bg: 'rgba(250, 204, 21, 0.15)', border: 'rgba(250, 204, 21, 0.35)' },
    { cor: '#818cf8', bg: 'rgba(129, 140, 248, 0.15)', border: 'rgba(129, 140, 248, 0.35)' }
];

function obterEstiloCategoria(catId) {
    const idNum = Number(catId) || 0;
    const idx = Math.abs(idNum) % PALETA_CORES.length;
    return PALETA_CORES[idx];
}

function formatarDataBR(dataString) {
    if (!dataString) return '-';
    const partes = dataString.split('T')[0].split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return dataString;
}

function calcularPrioridade(dataVencimento) {
    if (!dataVencimento) return null;
    const vencStr = dataVencimento.split('T')[0];
    const partes = vencStr.split('-').map(Number);
    if (partes.length !== 3) return null;

    const dataVenc = new Date(partes[0], partes[1] - 1, partes[2]);
    const agora = new Date();
    const dataHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    const diffMs = dataVenc.getTime() - dataHoje.getTime();
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
        const diasAtraso = Math.abs(diffDias);
        return {
            icone: 'fa-solid fa-triangle-exclamation',
            texto: diasAtraso === 1 ? 'Venceu ontem' : `Vencida há ${diasAtraso}d`,
            classe: styles.prioridadeVencida
        };
    } else if (diffDias === 0) {
        return {
            icone: 'fa-solid fa-fire',
            texto: 'Vence Hoje!',
            classe: styles.prioridadeHoje
        };
    } else if (diffDias <= 3) {
        return {
            icone: 'fa-solid fa-clock',
            texto: diffDias === 1 ? 'Vence amanhã' : `Vence em ${diffDias}d`,
            classe: styles.prioridadeEmBreve
        };
    } else {
        return {
            icone: 'fa-regular fa-calendar-check',
            texto: `Em ${diffDias} dias`,
            classe: styles.prioridadeNoPrazo
        };
    }
}

function TabelaContas({
    usuarioId,
    dados = [],
    categorias = [],
    contatos = [],
    aoRecarregarContatos,
    aoClicarPagar,
    aoSalvarNovaConta,
    aoSalvarEdicao,
    aoExcluirConta,
    aoClicarEstornar
}) {
    const [abaAtiva, setAbaAtiva] = useState('a_pagar');
    const [ordemListagem, setOrdemListagem] = useState('prioridade'); // 'prioridade' | 'insercao'
    const [mostrandoFormulario, setMostrandoFormulario] = useState(false);

    // Estado do Modal de Alerta
    const [modalAlerta, setModalAlerta] = useState({
        aberta: false,
        titulo: '',
        mensagem: '',
        tipo: 'aviso'
    });

    const mostrarAviso = (titulo, mensagem) => {
        setModalAlerta({
            aberta: true,
            titulo,
            mensagem,
            tipo: 'aviso'
        });
    };

    // Modal de Seleção de Favorecido / Contato
    const [modalContatoAberto, setModalContatoAberto] = useState(false);
    const [alvoModalContato, setAlvoModalContato] = useState('nova'); // 'nova' | 'edicao'

    const dataHoje = new Date().toISOString().split('T')[0];

    const [novaContaTemp, setNovaContaTemp] = useState({
        numero_boleto: '',
        categoria_id: '',
        nome: '',
        descricao: '',
        valor: '',
        emissao: dataHoje,
        vencimento: '',
        contato_id: null
    });

    const lidarComConfirmacaoContato = (contatoEscolhido) => {
        if (alvoModalContato === 'nova') {
            let catId = novaContaTemp.categoria_id;
            if (contatoEscolhido.tipo === 'fornecedor') {
                const cat = categorias.find(c => c.nome.toLowerCase().includes('fornecedor'));
                if (cat) catId = cat.id;
            } else if (contatoEscolhido.tipo === 'funcionario') {
                const cat = categorias.find(c => c.nome.toLowerCase().includes('funcionar'));
                if (cat) catId = cat.id;
            } else if (contatoEscolhido.tipo === 'terceirizado') {
                const cat = categorias.find(c => c.nome.toLowerCase().includes('terceriz') || c.nome.toLowerCase().includes('terceiriz'));
                if (cat) catId = cat.id;
            }

            setNovaContaTemp(prev => ({
                ...prev,
                nome: contatoEscolhido.nome,
                contato_id: contatoEscolhido.contato_id || null,
                categoria_id: catId || prev.categoria_id
            }));
        } else if (alvoModalContato === 'edicao') {
            setDadosEdicao(prev => ({
                ...prev,
                nome: contatoEscolhido.nome,
                contato_id: contatoEscolhido.contato_id || null
            }));
        }
    };

    const [editandoId, setEditandoId] = useState(null);
    const [dadosEdicao, setDadosEdicao] = useState({});

    const formatarValor = (valor) => {
        if (!valor) return 'R$ 0,00';
        return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const mudarInputNovaConta = (campo, valor) => setNovaContaTemp(prev => ({ ...prev, [campo]: valor }));

    const abrirFormularioNovaConta = () => {
        setNovaContaTemp({
            numero_boleto: '',
            categoria_id: categorias[0]?.id || '',
            nome: '',
            descricao: '',
            valor: '',
            emissao: dataHoje,
            vencimento: '',
            contato_id: null
        });
        setMostrandoFormulario(true);
    };

    const confirmarNovaConta = () => {
        if (!novaContaTemp.nome || !novaContaTemp.nome.trim()) {
            mostrarAviso('Nome Obrigatório', 'Por favor, preencha o Nome da conta.');
            return;
        }
        if (!novaContaTemp.valor || isNaN(novaContaTemp.valor) || Number(novaContaTemp.valor) <= 0) {
            mostrarAviso('Valor Inválido', 'Por favor, informe um Valor válido maior que zero.');
            return;
        }
        if (!novaContaTemp.emissao) {
            mostrarAviso('Data de Emissão Obrigatória', 'Por favor, informe a Data de Emissão.');
            return;
        }
        if (!novaContaTemp.vencimento) {
            mostrarAviso('Data de Vencimento Obrigatória', 'Por favor, informe a Data de Vencimento.');
            return;
        }

        const dadosParaSalvar = {
            ...novaContaTemp,
            nome: novaContaTemp.nome.trim(),
            valor: Number(novaContaTemp.valor),
            emissao: novaContaTemp.emissao,
            vencimento: novaContaTemp.vencimento,
            categoria_id: novaContaTemp.categoria_id || (categorias[0]?.id || 1),
            contato_id: novaContaTemp.contato_id || null
        };

        aoSalvarNovaConta(dadosParaSalvar);
        setNovaContaTemp({ numero_boleto: '', categoria_id: '', nome: '', descricao: '', valor: '', emissao: dataHoje, vencimento: '', contato_id: null });
        setMostrandoFormulario(false);
    };

    const iniciarEdicao = (item) => {
        setEditandoId(item.id);
        setDadosEdicao({ 
            ...item,
            contato_id: item.contato_id || null
        });
    };

    const aoMudarInputEdicao = (campo, valor) => setDadosEdicao(prev => ({ ...prev, [campo]: valor }));

    const confirmarEdicao = () => {
        if (!dadosEdicao.nome || !dadosEdicao.nome.trim()) {
            mostrarAviso('Nome Obrigatório', 'Por favor, preencha o Nome da conta.');
            return;
        }
        if (!dadosEdicao.valor || isNaN(dadosEdicao.valor) || Number(dadosEdicao.valor) <= 0) {
            mostrarAviso('Valor Inválido', 'Por favor, informe um Valor válido maior que zero.');
            return;
        }
        if (!dadosEdicao.emissao) {
            mostrarAviso('Data de Emissão Obrigatória', 'Por favor, informe a Data de Emissão.');
            return;
        }
        if (!dadosEdicao.vencimento) {
            mostrarAviso('Data de Vencimento Obrigatória', 'Por favor, informe a Data de Vencimento.');
            return;
        }

        const dadosParaSalvar = {
            ...dadosEdicao,
            nome: dadosEdicao.nome.trim(),
            valor: Number(dadosEdicao.valor),
            emissao: dadosEdicao.emissao,
            vencimento: dadosEdicao.vencimento,
            categoria_id: dadosEdicao.categoria_id || (categorias[0]?.id || 1),
            contato_id: dadosEdicao.contato_id || null
        };

        aoSalvarEdicao(dadosParaSalvar);
        setEditandoId(null);
    };

    const cancelarEdicao = () => {
        setEditandoId(null);
        setDadosEdicao({});
    };

    // Contadores para as abas
    const totalAPagar = dados.filter(i => i.status === 'PENDENTE' || i.status === 'PARCIAL').length;
    const totalPagas = dados.filter(i => i.status === 'PAGO').length;

    // Filtragem por status da aba
    const contasFiltradas = dados.filter((item) => {
        if (abaAtiva === 'a_pagar') {
            return item.status === 'PENDENTE' || item.status === 'PARCIAL';
        } else {
            return item.status === 'PAGO';
        }
    });

    // Ordenação dinâmica conforme escolha do usuário
    const contasOrdenadas = [...contasFiltradas].sort((a, b) => {
        if (abaAtiva === 'a_pagar') {
            if (ordemListagem === 'prioridade') {
                // PRIORIDADE: Vence primeiro (menor data de vencimento no topo). Em caso de empate, ID decrescente
                const vA = a.vencimento ? a.vencimento.split('T')[0] : '9999-99-99';
                const vB = b.vencimento ? b.vencimento.split('T')[0] : '9999-99-99';
                if (vA !== vB) {
                    return vA.localeCompare(vB);
                }
                return Number(b.id || 0) - Number(a.id || 0);
            } else {
                // INSERÇÃO: Últimas contas cadastradas primeiro (ID decrescente)
                return Number(b.id || 0) - Number(a.id || 0);
            }
        } else {
            // PAGAS: Ordena pelas mais recentemente pagas primeiro
            const pA = a.data_pagamento || a.emissao || '';
            const pB = b.data_pagamento || b.emissao || '';
            if (pA !== pB) {
                return pB.localeCompare(pA);
            }
            return Number(b.id || 0) - Number(a.id || 0);
        }
    });

    return (
        <div className={styles.containerPrincipal}>
            {/* LINHA DE ABAS + SELETOR DE ORDENAÇÃO */}
            <div className={styles.linhaTopoAbas}>
                <div className={styles.containerAbas}>
                    <button
                        className={`${styles.aba} ${abaAtiva === 'a_pagar' ? styles.abaAtivaBase + ' ' + styles.abaVermelha : ''}`}
                        onClick={() => { setAbaAtiva('a_pagar'); setMostrandoFormulario(false); setEditandoId(null); }}
                    >
                        <i className="fa-solid fa-clock"></i>
                        A PAGAR
                        <span className={styles.contadorAba}>{totalAPagar}</span>
                    </button>
                    <button
                        className={`${styles.aba} ${abaAtiva === 'pago' ? styles.abaAtivaBase + ' ' + styles.abaVerde : ''}`}
                        onClick={() => { setAbaAtiva('pago'); setMostrandoFormulario(false); setEditandoId(null); }}
                    >
                        <i className="fa-solid fa-circle-check"></i>
                        PAGAS
                        <span className={styles.contadorAba}>{totalPagas}</span>
                    </button>
                </div>

                {abaAtiva === 'a_pagar' && (
                    <div className={styles.grupoOrdenacao}>
                        <span className={styles.labelOrdenacao}>
                            <i className="fa-solid fa-arrow-down-short-wide"></i> Ordenar:
                        </span>
                        <button
                            type="button"
                            className={`${styles.btnOrdem} ${ordemListagem === 'prioridade' ? styles.btnOrdemAtivo : ''}`}
                            onClick={() => setOrdemListagem('prioridade')}
                            title="Contas com vencimento mais urgente primeiro"
                        >
                            <i className="fa-solid fa-bolt"></i> Prioridade (Vence 1º)
                        </button>
                        <button
                            type="button"
                            className={`${styles.btnOrdem} ${ordemListagem === 'insercao' ? styles.btnOrdemAtivo : ''}`}
                            onClick={() => setOrdemListagem('insercao')}
                            title="Contas mais recentes cadastradas primeiro"
                        >
                            <i className="fa-solid fa-clock-rotate-left"></i> Inserção
                        </button>
                    </div>
                )}
            </div>

            {/* CORPO DA TABELA */}
            <div className={styles.corpoTabela}>
                <div className={styles.cabecalhoTabela}>
                    <div className={`${styles.tituloColuna} ${styles.colunaId}`}>N° / REF</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaCategoria}`}>CATEGORIA</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaNome}`}>CONTATO</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaDesc}`}>DESCRIÇÃO</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaValor}`}>VALOR</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaData}`}>EMISSÃO</div>
                    <div className={`${styles.tituloColuna} ${styles.colunaVencimento}`}>
                        {abaAtiva === 'pago' ? 'PAGAMENTO' : 'VENCIMENTO'}
                    </div>
                    <div className={`${styles.tituloColuna} ${styles.colunaAcoes}`}>
                        {abaAtiva === 'a_pagar' ? (
                            <button className={styles.botaoNovaConta} onClick={abrirFormularioNovaConta}>
                                <i className="fa-solid fa-plus"></i> Nova Conta
                            </button>
                        ) : (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>AÇÕES</span>
                        )}
                    </div>
                </div>

                {/* FORMULÁRIO DE NOVA CONTA */}
                {abaAtiva === 'a_pagar' && mostrandoFormulario && (
                    <div className={`${styles.linhaContainer} ${styles.linhaFormularioNovaConta} ${styles.bordaVermelha}`}>
                        <div className={styles.colunaId}>
                            <input
                                className={styles.inputLinha}
                                placeholder="Ref / Bol"
                                value={novaContaTemp.numero_boleto}
                                onChange={(e) => mudarInputNovaConta('numero_boleto', e.target.value)}
                            />
                        </div>
                        <div className={styles.colunaCategoria}>
                            <select
                                className={styles.inputLinha}
                                value={novaContaTemp.categoria_id}
                                onChange={(e) => mudarInputNovaConta('categoria_id', e.target.value)}
                            >
                                <option value="">Selecione</option>
                                {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nome}</option>)}
                            </select>
                        </div>
                        <div className={styles.colunaNome}>
                            {!novaContaTemp.nome ? (
                                <button
                                    type="button"
                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeVazio}`}
                                    onClick={() => {
                                        setAlvoModalContato('nova');
                                        setModalContatoAberto(true);
                                    }}
                                    title="Clique para selecionar ou buscar um contato"
                                >
                                    <div className={styles.conteudoBtnNome}>
                                        <i className="fa-solid fa-user-plus"></i>
                                        <span>Contato *</span>
                                    </div>
                                    <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.5 }}></i>
                                </button>
                            ) : novaContaTemp.contato_id ? (
                                <button
                                    type="button"
                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeContato}`}
                                    onClick={() => {
                                        setAlvoModalContato('nova');
                                        setModalContatoAberto(true);
                                    }}
                                    title="Contato da agenda vinculado. Clique para alterar ou mudar para avulso."
                                >
                                    <div className={styles.conteudoBtnNome}>
                                        <i className="fa-solid fa-address-book" style={{ color: '#10b981' }}></i>
                                        <span className={styles.textoNomeBtn}>{novaContaTemp.nome}</span>
                                        <span className={`${styles.tagTipoBtn} ${styles['badge_' + (contatos.find(c => c.id === novaContaTemp.contato_id)?.tipo || 'fornecedor')]}`}>
                                            {contatos.find(c => c.id === novaContaTemp.contato_id)?.tipo === 'funcionario'
                                                ? 'Func'
                                                : contatos.find(c => c.id === novaContaTemp.contato_id)?.tipo === 'terceirizado'
                                                ? 'Terc'
                                                : 'Forn'}
                                        </span>
                                    </div>
                                    <i className="fa-solid fa-pen" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeAvulso}`}
                                    onClick={() => {
                                        setAlvoModalContato('nova');
                                        setModalContatoAberto(true);
                                    }}
                                    title="Favorecido avulso. Clique para alterar ou vincular a um contato da agenda."
                                >
                                    <div className={styles.conteudoBtnNome}>
                                        <i className="fa-solid fa-user-pen" style={{ color: '#94a3b8' }}></i>
                                        <span className={styles.textoNomeBtn}>{novaContaTemp.nome}</span>
                                        <span className={styles.tagAvulsoBtn}>Avulso</span>
                                    </div>
                                    <i className="fa-solid fa-pen" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                                </button>
                            )}
                        </div>
                        <div className={styles.colunaDesc}>
                            <input
                                className={styles.inputLinha}
                                placeholder="Descrição..."
                                value={novaContaTemp.descricao}
                                onChange={(e) => mudarInputNovaConta('descricao', e.target.value)}
                            />
                        </div>
                        <div className={styles.colunaValor}>
                            <input
                                className={styles.inputLinha}
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="0,00 *"
                                required
                                value={novaContaTemp.valor}
                                onChange={(e) => mudarInputNovaConta('valor', e.target.value)}
                            />
                        </div>
                        <div className={styles.colunaData}>
                            <input
                                className={styles.inputLinha}
                                type="date"
                                required
                                title="Data de Emissão (Obrigatória)"
                                value={novaContaTemp.emissao}
                                onChange={(e) => mudarInputNovaConta('emissao', e.target.value)}
                            />
                        </div>
                        <div className={styles.colunaVencimento}>
                            <input
                                className={styles.inputLinha}
                                type="date"
                                required
                                title="Data de Vencimento (Obrigatória)"
                                value={novaContaTemp.vencimento}
                                onChange={(e) => mudarInputNovaConta('vencimento', e.target.value)}
                            />
                        </div>
                        <div className={styles.colunaAcoes}>
                            <button
                                className={`${styles.btnIcon} ${styles.btnSalvar}`}
                                title="Salvar Conta"
                                onClick={confirmarNovaConta}
                            >
                                <i className="fa-solid fa-check"></i>
                            </button>
                            <button
                                className={`${styles.btnIcon} ${styles.btnCancelar}`}
                                title="Cancelar"
                                onClick={() => setMostrandoFormulario(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                )}

                {/* LISTAGEM DE CONTAS */}
                <div className={styles.listaDeItens}>
                    {contasOrdenadas.length === 0 ? (
                        <div className={styles.mensagemVazio}>
                            Nenhuma conta encontrada para o filtro selecionado.
                        </div>
                    ) : (
                        contasOrdenadas.map((item) => {
                            const estaEditando = editandoId === item.id;
                            const estiloCat = obterEstiloCategoria(item.categoria_id);
                            const nomeCategoria = categorias.find(c => c.id === item.categoria_id)?.nome || 'Geral';
                            const prioridade = abaAtiva === 'a_pagar' ? calcularPrioridade(item.vencimento) : null;

                            return (
                                <div
                                    key={item.id}
                                    className={`${styles.linhaContainer} ${
                                        item.status === 'PAGO'
                                            ? styles.bordaVerde
                                            : item.status === 'PARCIAL'
                                            ? styles.bordaAmarela
                                            : styles.bordaVermelha
                                    }`}
                                    style={{
                                        borderLeftColor: item.status === 'PAGO' ? '#10b981' : estiloCat.cor
                                    }}
                                >
                                    {/* N° / REFERÊNCIA */}
                                    <div className={styles.colunaId}>
                                        <input
                                            className={`${styles.inputLinha} ${!estaEditando ? styles.inputLeitura : ''}`}
                                            value={estaEditando ? dadosEdicao.numero_boleto : (item.numero_boleto || item.id)}
                                            readOnly={!estaEditando}
                                            onChange={(e) => aoMudarInputEdicao('numero_boleto', e.target.value)}
                                        />
                                    </div>

                                    {/* CATEGORIA COM BADGE COLORIDO */}
                                    <div className={styles.colunaCategoria}>
                                        {estaEditando ? (
                                            <select
                                                className={styles.inputLinha}
                                                value={dadosEdicao.categoria_id}
                                                onChange={(e) => aoMudarInputEdicao('categoria_id', e.target.value)}
                                            >
                                                <option value="">Selecione</option>
                                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </select>
                                        ) : (
                                            <span
                                                className={styles.badgeCategoria}
                                                style={{
                                                    backgroundColor: estiloCat.bg,
                                                    color: estiloCat.cor,
                                                    borderColor: estiloCat.border
                                                }}
                                                title={`Categoria: ${nomeCategoria}`}
                                            >
                                                {nomeCategoria}
                                            </span>
                                        )}
                                    </div>

                                    {/* NOME DA CONTA */}
                                    <div className={styles.colunaNome}>
                                        {estaEditando ? (
                                            !dadosEdicao.nome ? (
                                                <button
                                                    type="button"
                                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeVazio}`}
                                                    onClick={() => {
                                                        setAlvoModalContato('edicao');
                                                        setModalContatoAberto(true);
                                                    }}
                                                    title="Clique para selecionar ou buscar um contato"
                                                >
                                                    <div className={styles.conteudoBtnNome}>
                                                        <i className="fa-solid fa-user-plus"></i>
                                                        <span>Contato *</span>
                                                    </div>
                                                    <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.7rem', opacity: 0.5 }}></i>
                                                </button>
                                            ) : dadosEdicao.contato_id ? (
                                                <button
                                                    type="button"
                                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeContato}`}
                                                    onClick={() => {
                                                        setAlvoModalContato('edicao');
                                                        setModalContatoAberto(true);
                                                    }}
                                                    title="Contato da agenda vinculado. Clique para alterar ou mudar para avulso."
                                                >
                                                    <div className={styles.conteudoBtnNome}>
                                                        <i className="fa-solid fa-address-book" style={{ color: '#10b981' }}></i>
                                                        <span className={styles.textoNomeBtn}>{dadosEdicao.nome}</span>
                                                        <span className={`${styles.tagTipoBtn} ${styles['badge_' + (contatos.find(c => c.id === dadosEdicao.contato_id)?.tipo || 'fornecedor')]}`}>
                                                            {contatos.find(c => c.id === dadosEdicao.contato_id)?.tipo === 'funcionario'
                                                                ? 'Func'
                                                                : contatos.find(c => c.id === dadosEdicao.contato_id)?.tipo === 'terceirizado'
                                                                ? 'Terc'
                                                                : 'Forn'}
                                                        </span>
                                                    </div>
                                                    <i className="fa-solid fa-pen" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    className={`${styles.btnSeletorNome} ${styles.btnSeletorNomeAvulso}`}
                                                    onClick={() => {
                                                        setAlvoModalContato('edicao');
                                                        setModalContatoAberto(true);
                                                    }}
                                                    title="Favorecido avulso. Clique para alterar ou vincular a um contato da agenda."
                                                >
                                                    <div className={styles.conteudoBtnNome}>
                                                        <i className="fa-solid fa-user-pen" style={{ color: '#94a3b8' }}></i>
                                                        <span className={styles.textoNomeBtn}>{dadosEdicao.nome}</span>
                                                        <span className={styles.tagAvulsoBtn}>Avulso</span>
                                                    </div>
                                                    <i className="fa-solid fa-pen" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                                                </button>
                                            )
                                        ) : (
                                            <div className={styles.containerNomeConta}>
                                                <input
                                                    className={`${styles.inputLinha} ${styles.inputLeitura}`}
                                                    value={item.nome}
                                                    readOnly
                                                />
                                                {(item.contato_id || item.contato_nome) && (
                                                    <span
                                                        className={styles.iconeContatoVinculado}
                                                        title={`Contato vinculado: ${item.contato_nome || item.nome}${item.contato_chave_pix ? ` | PIX: ${item.contato_chave_pix}` : ''}`}
                                                    >
                                                        <i className="fa-solid fa-address-book"></i>
                                                        {item.contato_chave_pix && <i className="fa-brands fa-pix" style={{ marginLeft: '3px', color: '#10b981' }}></i>}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* DESCRIÇÃO */}
                                    <div className={styles.colunaDesc}>
                                        <input
                                            className={`${styles.inputLinha} ${!estaEditando ? styles.inputLeitura : ''}`}
                                            value={estaEditando ? dadosEdicao.descricao : (item.descricao || '-')}
                                            readOnly={!estaEditando}
                                            onChange={(e) => aoMudarInputEdicao('descricao', e.target.value)}
                                        />
                                    </div>

                                    {/* VALOR */}
                                    <div className={styles.colunaValor}>
                                        {estaEditando ? (
                                            <input
                                                className={styles.inputLinha}
                                                value={dadosEdicao.valor}
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                placeholder="0,00 *"
                                                required
                                                onChange={(e) => aoMudarInputEdicao('valor', e.target.value)}
                                            />
                                        ) : abaAtiva === 'pago' ? (
                                            <div className={`${styles.inputLinha} ${styles.inputLeitura}`} style={{ color: '#10b981', fontWeight: '700' }}>
                                                {formatarValor(item.valor_original || item.valor)}
                                            </div>
                                        ) : item.status === 'PARCIAL' ? (
                                            <div className={styles.containerProgresso}>
                                                <span className={styles.valorTotalParcial}>
                                                    {formatarValor(item.valor_original)}
                                                </span>
                                                <div className={styles.barraFundo}>
                                                    <div
                                                        className={styles.barraPreenchida}
                                                        style={{ width: `${(1 - (item.valor / item.valor_original)) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <span className={styles.textoRestante}>
                                                    Falta: {formatarValor(item.valor)}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className={`${styles.inputLinha} ${styles.inputLeitura}`} style={{ fontWeight: '700' }}>
                                                {formatarValor(item.valor)}
                                            </div>
                                        )}
                                    </div>

                                    {/* DATA DE EMISSÃO */}
                                    <div className={styles.colunaData}>
                                        {estaEditando ? (
                                            <input
                                                className={styles.inputLinha}
                                                type="date"
                                                required
                                                value={dadosEdicao.emissao}
                                                onChange={(e) => aoMudarInputEdicao('emissao', e.target.value)}
                                            />
                                        ) : (
                                            <div className={`${styles.inputLinha} ${styles.inputLeitura}`}>
                                                {formatarDataBR(item.emissao)}
                                            </div>
                                        )}
                                    </div>

                                    {/* DATA DE VENCIMENTO / PAGAMENTO COM BADGE DE PRIORIDADE */}
                                    <div className={styles.colunaVencimento}>
                                        {estaEditando ? (
                                            <input
                                                className={styles.inputLinha}
                                                type="date"
                                                required
                                                value={dadosEdicao.vencimento}
                                                onChange={(e) => aoMudarInputEdicao('vencimento', e.target.value)}
                                            />
                                        ) : abaAtiva === 'pago' ? (
                                            <div className={`${styles.inputLinha} ${styles.inputLeitura}`}>
                                                {formatarDataBR(item.data_pagamento || item.emissao)}
                                            </div>
                                        ) : (
                                            <div className={styles.wrapperVencimento}>
                                                <span className={styles.dataVencTexto}>
                                                    {formatarDataBR(item.vencimento)}
                                                </span>
                                                {prioridade && (
                                                    <span className={`${styles.badgePrioridade} ${prioridade.classe}`}>
                                                        <i className={prioridade.icone}></i>
                                                        {prioridade.texto}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* AÇÕES */}
                                    <div className={styles.colunaAcoes}>
                                        {estaEditando ? (
                                            <>
                                                <button
                                                    className={`${styles.btnIcon} ${styles.btnSalvar}`}
                                                    title="Salvar Alterações"
                                                    onClick={confirmarEdicao}
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                </button>
                                                <button
                                                    className={`${styles.btnIcon} ${styles.btnCancelar}`}
                                                    title="Cancelar Edição"
                                                    onClick={cancelarEdicao}
                                                >
                                                    <i className="fa-solid fa-xmark"></i>
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {abaAtiva === 'a_pagar' && (
                                                    <>
                                                        <button
                                                            className={`${styles.btnIcon} ${styles.btnEditar}`}
                                                            title="Editar conta"
                                                            onClick={() => iniciarEdicao(item)}
                                                        >
                                                            <i className="fa-solid fa-pen-to-square"></i>
                                                        </button>
                                                        <button
                                                            className={`${styles.btnIcon} ${styles.btnExcluir}`}
                                                            title="Excluir conta"
                                                            onClick={() => aoExcluirConta(item.id)}
                                                        >
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                        <button
                                                            className={`${styles.btnIcon} ${styles.btnPagar}`}
                                                            title="Pagar conta"
                                                            onClick={() => aoClicarPagar(item)}
                                                        >
                                                            <i className="fa-solid fa-money-bill-wave"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {abaAtiva === 'pago' && (
                                                    <button
                                                        className={`${styles.btnIcon} ${styles.btnExcluir}`}
                                                        title="Desfazer / Estornar pagamento"
                                                        onClick={() => aoClicarEstornar(item.id)}
                                                    >
                                                        <i className="fa-solid fa-rotate-left"></i>
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MODAL DE ALERTA PERSONALIZADO */}
            <ModalMensagem
                aberta={modalAlerta.aberta}
                tipo={modalAlerta.tipo}
                titulo={modalAlerta.titulo}
                mensagem={modalAlerta.mensagem}
                aoConfirmar={() => setModalAlerta(prev => ({ ...prev, aberta: false }))}
            />

            {/* MODAL DE SELEÇÃO E CADASTRO RÁPIDO DE CONTATO */}
            <ModalSelecionarContato
                aberto={modalContatoAberto}
                aoFechar={() => setModalContatoAberto(false)}
                contatos={contatos}
                contatoSelecionadoId={alvoModalContato === 'nova' ? novaContaTemp.contato_id : dadosEdicao.contato_id}
                nomeAtual={alvoModalContato === 'nova' ? novaContaTemp.nome : (dadosEdicao.nome || '')}
                aoConfirmar={lidarComConfirmacaoContato}
                usuarioId={usuarioId}
                aoContatoCriado={() => {
                    if (aoRecarregarContatos) aoRecarregarContatos();
                }}
            />
        </div>
    );
}

export default TabelaContas;