import { useState, useMemo, useEffect } from 'react';
import styles from '../../modules/ModalSelecionarContato.module.css';
import { apiPost } from '../../services/api';

function ModalSelecionarContato({
    aberto,
    aoFechar,
    contatos = [],
    contatoSelecionadoId = null,
    nomeAtual = '',
    aoConfirmar,
    usuarioId,
    aoContatoCriado
}) {
    const [busca, setBusca] = useState('');
    const [abaTipo, setAbaTipo] = useState('todos'); // 'todos' | 'fornecedor' | 'funcionario' | 'terceirizado'
    const [contatoEscolhido, setContatoEscolhido] = useState(null);

    // Formulário de Cadastro de Novo Contato no Modal
    const [modoCriarNovo, setModoCriarNovo] = useState(false);
    const [novoNome, setNovoNome] = useState('');
    const [novoTipo, setNovoTipo] = useState('fornecedor');
    const [novoPix, setNovoPix] = useState('');
    const [salvandoNovo, setSalvandoNovo] = useState(false);
    const [erroNovo, setErroNovo] = useState('');

    // Sincroniza estado inicial sempre que o modal abre
    useEffect(() => {
        if (aberto) {
            setBusca('');
            setAbaTipo('todos');
            setModoCriarNovo(false);
            setErroNovo('');
            setNovoNome(nomeAtual || '');
            setNovoTipo('fornecedor');
            setNovoPix('');

            if (contatoSelecionadoId) {
                const atual = contatos.find(c => Number(c.id) === Number(contatoSelecionadoId));
                setContatoEscolhido(atual || null);
            } else if (nomeAtual) {
                const matchExato = contatos.find(c => (c.nome || '').trim().toUpperCase() === nomeAtual.trim().toUpperCase());
                setContatoEscolhido(matchExato || null);
            } else {
                setContatoEscolhido(null);
            }
        }
    }, [aberto, contatoSelecionadoId, nomeAtual, contatos]);

    // Filtragem dos contatos por nome/PIX e tipo
    const contatosFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return contatos.filter(c => {
            // Filtro por tipo
            if (abaTipo !== 'todos' && c.tipo !== abaTipo) {
                return false;
            }
            // Filtro por busca
            if (!termo) return true;
            const bateNome = (c.nome || '').toLowerCase().includes(termo);
            const batePix = (c.chave_pix || '').toLowerCase().includes(termo);
            return bateNome || batePix;
        });
    }, [contatos, busca, abaTipo]);

    if (!aberto) return null;

    const lidarComConfirmacao = () => {
        if (!contatoEscolhido) return;
        aoConfirmar({
            nome: contatoEscolhido.nome,
            contato_id: contatoEscolhido.id,
            chave_pix: contatoEscolhido.chave_pix || '',
            tipo: contatoEscolhido.tipo || 'fornecedor'
        });
        aoFechar();
    };

    const usarComoAvulso = (nomeEspecifico) => {
        const valorNome = (nomeEspecifico || busca || nomeAtual || '').trim().toUpperCase();
        if (!valorNome) return;
        aoConfirmar({
            nome: valorNome,
            contato_id: null,
            chave_pix: '',
            tipo: ''
        });
        aoFechar();
    };

    const salvarNovoContato = async (e) => {
        if (e) e.preventDefault();
        const nomeLimpo = novoNome.trim().toUpperCase();
        if (!nomeLimpo) {
            setErroNovo('O nome do contato é obrigatório.');
            return;
        }

        setSalvandoNovo(true);
        setErroNovo('');

        try {
            const novoContato = await apiPost('/contatos', {
                nome: nomeLimpo,
                chave_pix: novoPix.trim(),
                tipo: novoTipo
            }, usuarioId);

            if (aoContatoCriado) {
                aoContatoCriado(novoContato);
            }

            // Já seleciona e confirma automaticamente o novo contato criado!
            aoConfirmar({
                nome: novoContato.nome,
                contato_id: novoContato.id,
                chave_pix: novoContato.chave_pix || '',
                tipo: novoContato.tipo || novoTipo
            });

            aoFechar();
        } catch (err) {
            console.error('Erro ao salvar novo contato:', err);
            setErroNovo('Não foi possível cadastrar o contato. Verifique os dados e tente novamente.');
        } finally {
            setSalvandoNovo(false);
        }
    };

    return (
        <div className={styles.overlay} onClick={aoFechar}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                
                {/* CABEÇALHO */}
                <div className={styles.modalHeader}>
                    <h3 className={styles.tituloModal}>
                        <i className="fa-solid fa-address-book"></i>
                        {modoCriarNovo ? 'Cadastrar Novo Contato' : 'Selecionar Favorecido / Contato'}
                    </h3>
                    <button className={styles.btnFechar} onClick={aoFechar} title="Fechar modal">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* CORPO DO MODAL */}
                <div className={styles.modalCorpo}>

                    {modoCriarNovo ? (
                        /* FORMULÁRIO DE CADASTRO RÁPIDO */
                        <div className={styles.areaNovoContato}>
                            <h4 className={styles.tituloNovoContato}>
                                <i className="fa-solid fa-user-plus"></i> Novo Contato na sua Agenda
                            </h4>

                            {erroNovo && (
                                <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                                    <i className="fa-solid fa-triangle-exclamation"></i> {erroNovo}
                                </div>
                            )}

                            <div className={styles.campoForm}>
                                <label className={styles.labelForm}>Nome Completo / Razão Social *</label>
                                <input
                                    className={styles.inputForm}
                                    placeholder="Ex: POSTO IPIRANGA, JOÃO SILVA..."
                                    value={novoNome}
                                    autoFocus
                                    onChange={(e) => setNovoNome(e.target.value)}
                                />
                            </div>

                            <div className={styles.campoForm}>
                                <label className={styles.labelForm}>Categoria / Tipo</label>
                                <select
                                    className={styles.selectForm}
                                    value={novoTipo}
                                    onChange={(e) => setNovoTipo(e.target.value)}
                                >
                                    <option value="fornecedor">Fornecedor</option>
                                    <option value="funcionario">Funcionário</option>
                                    <option value="terceirizado">Prestador Terceirizado</option>
                                </select>
                            </div>

                            <div className={styles.campoForm}>
                                <label className={styles.labelForm}>
                                    Chave PIX <span style={{ color: '#94a3b8', textTransform: 'none', fontWeight: 400 }}>(Opcional)</span>
                                </label>
                                <input
                                    className={styles.inputForm}
                                    placeholder="CPF, CNPJ, Celular, E-mail ou Aleatória"
                                    value={novoPix}
                                    onChange={(e) => setNovoPix(e.target.value)}
                                />
                                <span className={styles.dicaPix}>
                                    Se não tiver o PIX agora, pode salvar em branco e adicionar depois na tela de Contatos.
                                </span>
                            </div>

                            <div className={styles.acoesNovoContato}>
                                <button
                                    type="button"
                                    className={styles.btnCancelarNovo}
                                    onClick={() => setModoCriarNovo(false)}
                                    disabled={salvandoNovo}
                                >
                                    Voltar para Lista
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnSalvarNovo}
                                    onClick={salvarNovoContato}
                                    disabled={salvandoNovo}
                                >
                                    {salvandoNovo ? (
                                        <>
                                            <i className="fa-solid fa-spinner fa-spin"></i> Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-check"></i> Salvar e Selecionar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* TELA DE BUSCA E LISTAGEM */
                        <>
                            {/* BARRA DE PESQUISA */}
                            <div className={styles.searchContainer}>
                                <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`}></i>
                                <input
                                    className={styles.searchInput}
                                    placeholder="Buscar por nome ou chave PIX..."
                                    value={busca}
                                    autoFocus
                                    onChange={(e) => setBusca(e.target.value)}
                                />
                            </div>

                            {/* ABAS DE TIPO */}
                            <div className={styles.abasTipo}>
                                <button
                                    type="button"
                                    className={`${styles.abaBotao} ${abaTipo === 'todos' ? styles.abaAtiva : ''}`}
                                    onClick={() => setAbaTipo('todos')}
                                >
                                    Todos ({contatos.length})
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.abaBotao} ${abaTipo === 'fornecedor' ? styles.abaAtiva : ''}`}
                                    onClick={() => setAbaTipo('fornecedor')}
                                >
                                    Fornecedores
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.abaBotao} ${abaTipo === 'funcionario' ? styles.abaAtiva : ''}`}
                                    onClick={() => setAbaTipo('funcionario')}
                                >
                                    Funcionários
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.abaBotao} ${abaTipo === 'terceirizado' ? styles.abaAtiva : ''}`}
                                    onClick={() => setAbaTipo('terceirizado')}
                                >
                                    Terceirizados
                                </button>
                            </div>

                            {/* OPÇÃO DE USAR COMO AVULSO QUANDO O USUÁRIO DIGITA ALGO */}
                            {busca.trim().length > 0 && (
                                <div className={styles.boxOpcaoAvulsa}>
                                    <p className={styles.textoAvulso}>
                                        Usar <strong>"{busca.trim().toUpperCase()}"</strong> apenas nesta conta sem cadastrar contato:
                                    </p>
                                    <button
                                        type="button"
                                        className={styles.btnUsarAvulso}
                                        onClick={() => usarComoAvulso(busca)}
                                    >
                                        <i className="fa-solid fa-pen-nib"></i> Usar como Avulso
                                    </button>
                                </div>
                            )}

                            {/* LISTA DE CONTATOS */}
                            <div className={styles.listaContatos}>
                                {contatosFiltrados.length === 0 ? (
                                    <div className={styles.boxVazio}>
                                        <i className="fa-solid fa-user-slash" style={{ fontSize: '1.5rem', color: '#64748b' }}></i>
                                        <span>Nenhum contato encontrado para a busca.</span>
                                        {busca.trim() && (
                                            <button
                                                type="button"
                                                className={styles.btnAbrirNovoContato}
                                                style={{ marginTop: '8px' }}
                                                onClick={() => {
                                                    setNovoNome(busca.trim().toUpperCase());
                                                    setModoCriarNovo(true);
                                                }}
                                            >
                                                <i className="fa-solid fa-plus"></i> Cadastrar "{busca.trim().toUpperCase()}" agora
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    contatosFiltrados.map(contato => {
                                        const estaSelecionado = contatoEscolhido?.id === contato.id;
                                        return (
                                            <div
                                                key={contato.id}
                                                className={`${styles.itemContato} ${estaSelecionado ? styles.itemContatoSelecionado : ''}`}
                                                onClick={() => setContatoEscolhido(contato)}
                                                onDoubleClick={() => {
                                                    setContatoEscolhido(contato);
                                                    aoConfirmar({
                                                        nome: contato.nome,
                                                        contato_id: contato.id,
                                                        chave_pix: contato.chave_pix || '',
                                                        tipo: contato.tipo || 'fornecedor'
                                                    });
                                                    aoFechar();
                                                }}
                                            >
                                                <div className={styles.contatoInfo}>
                                                    <div className={styles.contatoNomeLinha}>
                                                        <span className={styles.contatoNome}>{contato.nome}</span>
                                                        <span className={`${styles.badgeTipo} ${styles['badge_' + (contato.tipo || 'fornecedor')]}`}>
                                                            {contato.tipo === 'funcionario' ? 'Funcionário' : contato.tipo === 'terceirizado' ? 'Terceirizado' : 'Fornecedor'}
                                                        </span>
                                                    </div>
                                                    {contato.chave_pix ? (
                                                        <span className={styles.contatoPix}>
                                                            <i className="fa-brands fa-pix"></i> {contato.chave_pix}
                                                        </span>
                                                    ) : (
                                                        <span className={styles.contatoSemPix}>
                                                            Sem chave PIX cadastrada
                                                        </span>
                                                    )}
                                                </div>

                                                {estaSelecionado && (
                                                    <i className={`fa-solid fa-circle-check ${styles.iconeCheck}`}></i>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </>
                    )}

                </div>

                {/* RODAPÉ DO MODAL */}
                <div className={styles.modalFooter}>
                    {!modoCriarNovo ? (
                        <>
                            <button
                                type="button"
                                className={styles.btnAbrirNovoContato}
                                onClick={() => {
                                    setNovoNome(busca.trim() ? busca.trim().toUpperCase() : (nomeAtual || ''));
                                    setModoCriarNovo(true);
                                }}
                            >
                                <i className="fa-solid fa-plus"></i> Novo Contato
                            </button>

                            <div className={styles.footerAcoesDireita}>
                                <button type="button" className={styles.btnCancelar} onClick={aoFechar}>
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className={styles.btnConfirmar}
                                    disabled={!contatoEscolhido}
                                    onClick={lidarComConfirmacao}
                                >
                                    <i className="fa-solid fa-check"></i> Confirmar Seleção
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ width: '100%', textAlign: 'right' }}>
                            <button
                                type="button"
                                className={styles.btnCancelar}
                                onClick={() => setModoCriarNovo(false)}
                            >
                                Voltar
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

export default ModalSelecionarContato;
