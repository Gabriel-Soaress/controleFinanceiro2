import React, { useState, useEffect, useMemo } from 'react';
import styles from '../modules/Contatos.module.css';
import ModalMensagem from '../components/modais/ModalMensagem';
import { apiGet, apiPost, apiPut, apiDelete } from '../services/api';

function Contatos({ usuarioId, aoVoltar, tema = 'escuro' }) {
    const [contatos, setContatos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [termoBusca, setTermoBusca] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState('todos'); // 'todos' | 'fornecedor' | 'funcionario' | 'terceirizado'

    // Estado do Modal de Cadastro / Edição
    const [modalContatoAberto, setModalContatoAberto] = useState(false);
    const [contatoEdicao, setContatoEdicao] = useState(null); // null para novo contato
    const [formTipo, setFormTipo] = useState('fornecedor');
    const [formNome, setFormNome] = useState('');
    const [formPix, setFormPix] = useState('');

    // Estado do Modal de Confirmação e Mensagens
    const [modalMsg, setModalMsg] = useState({
        aberta: false,
        tipo: 'aviso',
        titulo: '',
        mensagem: '',
        perigoso: false,
        aoConfirmar: null
    });

    // Feedback de PIX copiado
    const [copiadoId, setCopiadoId] = useState(null);

    const carregarContatos = async () => {
        try {
            setCarregando(true);
            const data = await apiGet('/contatos', usuarioId);
            setContatos(Array.isArray(data) ? data : []);
        } catch (erro) {
            console.error('Erro ao carregar contatos:', erro);
            mostrarAviso('Erro', 'Não foi possível carregar a lista de contatos do servidor.', 'erro');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarContatos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId]);

    const mostrarAviso = (titulo, mensagem, tipo = 'aviso') => {
        setModalMsg({
            aberta: true,
            tipo,
            titulo,
            mensagem,
            perigoso: false,
            aoConfirmar: () => setModalMsg(prev => ({ ...prev, aberta: false }))
        });
    };

    // Contadores para os filtros
    const contadores = useMemo(() => {
        const c = { todos: contatos.length, fornecedor: 0, funcionario: 0, terceirizado: 0 };
        contatos.forEach(item => {
            if (c[item.tipo] !== undefined) c[item.tipo]++;
        });
        return c;
    }, [contatos]);

    // Filtragem em tempo real
    const contatosFiltrados = useMemo(() => {
        const busca = termoBusca.trim().toLowerCase();
        return contatos.filter(c => {
            const bateTipo = tipoFiltro === 'todos' || c.tipo === tipoFiltro;
            const bateBusca = !busca ||
                (c.nome && c.nome.toLowerCase().includes(busca)) ||
                (c.chave_pix && c.chave_pix.toLowerCase().includes(busca));
            return bateTipo && bateBusca;
        });
    }, [contatos, tipoFiltro, termoBusca]);

    // Ações do formulário
    const abrirNovoContato = () => {
        setContatoEdicao(null);
        setFormTipo(tipoFiltro !== 'todos' ? tipoFiltro : 'fornecedor');
        setFormNome('');
        setFormPix('');
        setModalContatoAberto(true);
    };

    const abrirEditarContato = (contato) => {
        setContatoEdicao(contato);
        setFormTipo(contato.tipo || 'fornecedor');
        setFormNome(contato.nome || '');
        setFormPix(contato.chave_pix || '');
        setModalContatoAberto(true);
    };

    const salvarContato = async (e) => {
        e.preventDefault();
        if (!formNome.trim()) {
            mostrarAviso('Campo Obrigatório', 'Por favor, informe o Nome do contato.', 'aviso');
            return;
        }

        try {
            if (contatoEdicao) {
                // Atualização
                const atualizado = await apiPut(`/contatos/${contatoEdicao.id}`, {
                    nome: formNome.trim().toUpperCase(),
                    chave_pix: formPix.trim(),
                    tipo: formTipo
                }, usuarioId);
                setContatos(prev => prev.map(c => c.id === atualizado.id ? atualizado : c));
            } else {
                // Criação
                const novo = await apiPost('/contatos', {
                    nome: formNome.trim().toUpperCase(),
                    chave_pix: formPix.trim(),
                    tipo: formTipo
                }, usuarioId);
                setContatos(prev => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
            }
            setModalContatoAberto(false);
        } catch (erro) {
            console.error('Erro ao salvar contato:', erro);
            mostrarAviso('Erro ao Salvar', 'Não foi possível salvar os dados do contato.', 'erro');
        }
    };

    const solicitarExclusao = (contato) => {
        setModalMsg({
            aberta: true,
            tipo: 'confirmacao',
            titulo: 'Excluir Contato',
            mensagem: `Tem certeza que deseja remover "${contato.nome}" da sua rede de contatos? Esta ação não poderá ser desfeita.`,
            perigoso: true,
            textoConfirmar: 'Sim, Excluir',
            aoConfirmar: async () => {
                setModalMsg(prev => ({ ...prev, aberta: false }));
                try {
                    await apiDelete(`/contatos/${contato.id}`, usuarioId);
                    setContatos(prev => prev.filter(c => c.id !== contato.id));
                } catch (erro) {
                    console.error('Erro ao excluir:', erro);
                    mostrarAviso('Erro', 'Não foi possível excluir o contato.', 'erro');
                }
            }
        });
    };

    const copiarPix = (contato) => {
        if (!contato.chave_pix) return;
        navigator.clipboard.writeText(contato.chave_pix);
        setCopiadoId(contato.id);
        setTimeout(() => setCopiadoId(null), 2000);
    };

    const formatarBadgeTipo = (tipo) => {
        switch (tipo) {
            case 'fornecedor':
                return { label: 'Fornecedor', classe: styles.badgeFornecedor, icone: 'fa-truck-field' };
            case 'funcionario':
                return { label: 'Funcionário', classe: styles.badgeFuncionario, icone: 'fa-user-tie' };
            case 'terceirizado':
                return { label: 'Serviço Terceirizado', classe: styles.badgeTerceirizado, icone: 'fa-screwdriver-wrench' };
            default:
                return { label: tipo, classe: styles.badgeFornecedor, icone: 'fa-address-book' };
        }
    };

    return (
        <div className={styles.paginaContatos}>
            {/* CABEÇALHO */}
            <div className={styles.cabecalho}>
                <div className={styles.infoArea}>
                    <button type="button" className={styles.btnVoltar} onClick={aoVoltar} title="Voltar ao Painel">
                        <i className="fa-solid fa-arrow-left"></i> Voltar ao Dashboard
                    </button>
                    <h1 className={styles.tituloPrincipal}>
                        <i className="fa-solid fa-address-book"></i> Rede de Contatos & Favorecidos
                    </h1>
                    <p className={styles.subtituloPrincipal}>
                        Gerencie fornecedores, colaboradores e prestadores de serviço com chaves PIX para pagamentos ágeis.
                    </p>
                </div>

                <button type="button" className={styles.btnNovoContato} onClick={abrirNovoContato}>
                    <i className="fa-solid fa-plus"></i> Novo Contato
                </button>
            </div>

            {/* BARRA DE CONTROLES: FILTROS E BUSCA */}
            <div className={styles.barraControles}>
                {/* ABAS DE TIPO */}
                <div className={styles.tabsTipo}>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tipoFiltro === 'todos' ? styles.tabAtiva : ''}`}
                        onClick={() => setTipoFiltro('todos')}
                    >
                        <i className="fa-solid fa-layer-group"></i> Todos
                        <span className={styles.badgeContador}>{contadores.todos}</span>
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tipoFiltro === 'fornecedor' ? styles.tabAtiva : ''}`}
                        onClick={() => setTipoFiltro('fornecedor')}
                    >
                        <i className="fa-solid fa-truck-field"></i> Fornecedores
                        <span className={styles.badgeContador}>{contadores.fornecedor}</span>
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tipoFiltro === 'funcionario' ? styles.tabAtiva : ''}`}
                        onClick={() => setTipoFiltro('funcionario')}
                    >
                        <i className="fa-solid fa-user-tie"></i> Funcionários
                        <span className={styles.badgeContador}>{contadores.funcionario}</span>
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabBtn} ${tipoFiltro === 'terceirizado' ? styles.tabAtiva : ''}`}
                        onClick={() => setTipoFiltro('terceirizado')}
                    >
                        <i className="fa-solid fa-screwdriver-wrench"></i> Terceirizados
                        <span className={styles.badgeContador}>{contadores.terceirizado}</span>
                    </button>
                </div>

                {/* CAMPO DE BUSCA EM TEMPO REAL */}
                <div className={styles.campoBusca}>
                    <i className={`fa-solid fa-magnifying-glass ${styles.iconeBusca}`}></i>
                    <input
                        type="text"
                        placeholder="Buscar por nome ou chave PIX..."
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        className={styles.inputBusca}
                    />
                    {termoBusca && (
                        <button
                            type="button"
                            className={styles.btnLimparBusca}
                            onClick={() => setTermoBusca('')}
                            title="Limpar busca"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* TABELA DE CONTATOS */}
            <div className={styles.tabelaContainer}>
                {carregando ? (
                    <div className={styles.estadoVazio}>
                        <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                        <p>Carregando contatos...</p>
                    </div>
                ) : contatosFiltrados.length === 0 ? (
                    <div className={styles.estadoVazio}>
                        <i className="fa-solid fa-users-slash fa-3x"></i>
                        <p>Nenhum contato encontrado com os filtros aplicados.</p>
                        {termoBusca && (
                            <button
                                type="button"
                                className={styles.btnLimparFiltros}
                                onClick={() => { setTermoBusca(''); setTipoFiltro('todos'); }}
                            >
                                Limpar busca e filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <table className={styles.tabela}>
                        <thead>
                            <tr>
                                <th style={{ width: '180px' }}>Tipo</th>
                                <th>Nome do Contato</th>
                                <th style={{ width: '320px' }}>Chave PIX</th>
                                <th style={{ width: '130px', textAlign: 'center' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contatosFiltrados.map((contato) => {
                                const badge = formatarBadgeTipo(contato.tipo);
                                const ehCopiado = copiadoId === contato.id;

                                return (
                                    <tr key={contato.id} className={styles.linhaTabela}>
                                        {/* TIPO */}
                                        <td>
                                            <span className={`${styles.badgeTipo} ${badge.classe}`}>
                                                <i className={`fa-solid ${badge.icone}`}></i>
                                                {badge.label}
                                            </span>
                                        </td>

                                        {/* NOME */}
                                        <td>
                                            <div className={styles.colunaNome}>
                                                <div className={styles.avatarInicial}>
                                                    {contato.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <span className={styles.nomeTexto}>{contato.nome}</span>
                                            </div>
                                        </td>

                                        {/* CHAVE PIX */}
                                        <td>
                                            {contato.chave_pix ? (
                                                <div className={styles.pixContainer}>
                                                    <span className={styles.pixTexto} title={contato.chave_pix}>
                                                        {contato.chave_pix}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className={`${styles.btnCopiarPix} ${ehCopiado ? styles.btnCopiado : ''}`}
                                                        onClick={() => copiarPix(contato)}
                                                        title="Copiar Chave PIX"
                                                    >
                                                        {ehCopiado ? (
                                                            <>
                                                                <i className="fa-solid fa-check"></i> Copiado!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="fa-solid fa-copy"></i> Copiar
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className={styles.pixVazio}>Não informada</span>
                                            )}
                                        </td>

                                        {/* AÇÕES */}
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.acoesContainer}>
                                                <button
                                                    type="button"
                                                    className={styles.btnAcaoEditar}
                                                    onClick={() => abrirEditarContato(contato)}
                                                    title="Editar Contato"
                                                >
                                                    <i className="fa-solid fa-pen-to-square"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.btnAcaoExcluir}
                                                    onClick={() => solicitarExclusao(contato)}
                                                    title="Excluir Contato"
                                                >
                                                    <i className="fa-solid fa-trash-can"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL DE CADASTRO / EDIÇÃO */}
            {modalContatoAberto && (
                <div className={styles.modalOverlay} onClick={() => setModalContatoAberto(false)}>
                    <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>
                                <i className={contatoEdicao ? "fa-solid fa-pen-to-square" : "fa-solid fa-user-plus"}></i>
                                {contatoEdicao ? 'Editar Contato' : 'Novo Contato'}
                            </h2>
                            <button
                                type="button"
                                className={styles.btnFecharModal}
                                onClick={() => setModalContatoAberto(false)}
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <form onSubmit={salvarContato} className={styles.modalForm}>
                            {/* TIPO */}
                            <div className={styles.formGrupo}>
                                <label className={styles.formLabel}>Classificação / Tipo</label>
                                <div className={styles.opcoesTipo}>
                                    <label className={`${styles.opcaoTipoCard} ${formTipo === 'fornecedor' ? styles.opcaoSelecionada : ''}`}>
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="fornecedor"
                                            checked={formTipo === 'fornecedor'}
                                            onChange={(e) => setFormTipo(e.target.value)}
                                        />
                                        <i className="fa-solid fa-truck-field"></i>
                                        <span>Fornecedor</span>
                                    </label>
                                    <label className={`${styles.opcaoTipoCard} ${formTipo === 'funcionario' ? styles.opcaoSelecionada : ''}`}>
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="funcionario"
                                            checked={formTipo === 'funcionario'}
                                            onChange={(e) => setFormTipo(e.target.value)}
                                        />
                                        <i className="fa-solid fa-user-tie"></i>
                                        <span>Funcionário</span>
                                    </label>
                                    <label className={`${styles.opcaoTipoCard} ${formTipo === 'terceirizado' ? styles.opcaoSelecionada : ''}`}>
                                        <input
                                            type="radio"
                                            name="tipo"
                                            value="terceirizado"
                                            checked={formTipo === 'terceirizado'}
                                            onChange={(e) => setFormTipo(e.target.value)}
                                        />
                                        <i className="fa-solid fa-screwdriver-wrench"></i>
                                        <span>Terceirizado</span>
                                    </label>
                                </div>
                            </div>

                            {/* NOME */}
                            <div className={styles.formGrupo}>
                                <label className={styles.formLabel}>Nome do Favorecido *</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    style={{ textTransform: 'uppercase' }}
                                    placeholder="Ex: TASS, ALVEZ, MARIA DA SILVA..."
                                    required
                                    autoFocus
                                    value={formNome}
                                    onChange={(e) => setFormNome(e.target.value.toUpperCase())}
                                />
                            </div>

                            {/* CHAVE PIX */}
                            <div className={styles.formGrupo}>
                                <label className={styles.formLabel}>Chave PIX (Telefone, CNPJ, CPF, Email ou Aleatória)</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="Ex: 18-99999-9999 ou 00.000.000/0001-00..."
                                    value={formPix}
                                    onChange={(e) => setFormPix(e.target.value)}
                                />
                            </div>

                            <div className={styles.modalAcoes}>
                                <button
                                    type="button"
                                    className={styles.btnCancelarForm}
                                    onClick={() => setModalContatoAberto(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={styles.btnSalvarForm}
                                >
                                    <i className="fa-solid fa-check"></i>
                                    {contatoEdicao ? 'Salvar Alterações' : 'Cadastrar Contato'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL UNIVERSAL DE MENSAGENS E CONFIRMAÇÕES */}
            <ModalMensagem
                aberta={modalMsg.aberta}
                tipo={modalMsg.tipo}
                titulo={modalMsg.titulo}
                mensagem={modalMsg.mensagem}
                perigoso={modalMsg.perigoso}
                textoConfirmar={modalMsg.textoConfirmar}
                aoConfirmar={modalMsg.aoConfirmar}
                aoCancelar={() => setModalMsg(prev => ({ ...prev, aberta: false }))}
            />
        </div>
    );
}

export default Contatos;
