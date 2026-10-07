import { useState, useEffect, useMemo } from 'react';
import styles from '../../modules/ModalPagamentos.module.css';
import ModalMensagem from './ModalMensagem';

// 1. Adicionada a prop 'aoConfirmar' e 'contatos' aqui no topo
function ModalPagamento({ conta, aoFechar, carteiras = [], contatos = [], aoConfirmar }) {

    // Convertendo para ter certeza que é número
    const valorOriginal = parseFloat(conta.valor);

    const [valorPago, setValorPago] = useState(valorOriginal);
    const [origem, setOrigem] = useState('');
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [natureza, setNatureza] = useState('TOTAL');

    // Validação
    const [mensagem, setMensagem] = useState(null);
    const [bloquearBotao, setBloquearBotao] = useState(false);
    const [classeMensagem, setClasseMensagem] = useState('');
    const [modalAlertaAberto, setModalAlertaAberto] = useState(false);
    const [pixCopiado, setPixCopiado] = useState(false);
    const [modoAlterarContato, setModoAlterarContato] = useState(false);

    // 1. Identificação segura do contato vinculado
    const contatoIdentificado = useMemo(() => {
        if (!conta || !contatos || contatos.length === 0) return null;

        // Prioridade 1: ID direto do contato registrado na conta
        if (conta.contato_id) {
            const matchId = contatos.find(c => Number(c.id) === Number(conta.contato_id));
            if (matchId) return matchId;
        }

        // Prioridade 2: Correspondência 100% EXATA pelo nome cadastrado
        const nomeConta = (conta.nome || '').trim().toUpperCase();
        if (nomeConta) {
            const matchExato = contatos.find(c => (c.nome || '').trim().toUpperCase() === nomeConta);
            if (matchExato) return matchExato;
        }

        // NUNCA usar match parcial ou substring (includes) para evitar transferências para terceiros incorretos!
        return null;
    }, [conta, contatos]);

    const [contatoAtivo, setContatoAtivo] = useState(contatoIdentificado);

    useEffect(() => {
        setContatoAtivo(contatoIdentificado);
    }, [contatoIdentificado]);

    const copiarPix = () => {
        if (!contatoAtivo?.chave_pix) return;
        navigator.clipboard.writeText(contatoAtivo.chave_pix);
        setPixCopiado(true);
        setTimeout(() => setPixCopiado(false), 2000);
    };

    useEffect(() => {
        const valorInserido = parseFloat(valorPago);

        // Reset inicial
        setMensagem(null);
        setBloquearBotao(false);

        if (!valorInserido || valorInserido <= 0) {
            setBloquearBotao(true);
            return;
        }

        // --- REGRAS DE VALIDAÇÃO ---
        if (valorInserido > valorOriginal && natureza === 'PARCIAL') {
            setMensagem("ERRO: O valor inserido é maior que a dívida. Não pode ser Parcial.");
            setClasseMensagem('mensagemErro');
            setBloquearBotao(true);
        }
        else if (valorInserido === valorOriginal && natureza === 'PARCIAL') {
            setMensagem("O valor quita a dívida inteira. Mude a natureza para TOTAL.");
            setClasseMensagem('mensagemErro');
            setBloquearBotao(true);
        }
        else if (valorInserido < valorOriginal && natureza === 'TOTAL') {
            setMensagem("Valor menor que a dívida. Confirmar como pagamento TOTAL (com desconto)?");
            setClasseMensagem('mensagemAviso');
        }
        else if (valorInserido < valorOriginal && natureza === 'PARCIAL') {
            setMensagem("Pagamento parcial. O restante continuará em aberto.");
            setClasseMensagem('mensagemAviso');
        }

    }, [valorPago, natureza, valorOriginal]);


    const lidarComPagamento = () => {
        // Validação final: Origem é obrigatória antes de enviar para o banco
        if (!origem) {
            setModalAlertaAberto(true);
            return;
        }

        // 2. Pacote de dados que o Back-end (server.js) está esperando
        const dadosPagamento = {
            conta_id: conta.id,
            carteira_id: origem,
            valor: parseFloat(valorPago),
            data_pagamento: dataPagamento,
            natureza: natureza // Aqui o servidor decide se UPDATE valor ou status='PAGO'
        };

        // 3. Chama a função que criamos no Dashboard
        aoConfirmar(dadosPagamento);

        // 4. Fecha o modal
        aoFechar();
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modalBox}>
                <button className={styles.botaoFechar} onClick={aoFechar}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <h2 className={styles.titulo}>
                    PAGAR: {conta.nome}
                </h2>

                {/* ÁREA DE PIX SEGURA */}
                {contatoAtivo ? (
                    <div className={styles.cardPix}>
                        <div className={styles.cardPixHeader}>
                            <div className={styles.cardPixTitulo}>
                                <i className="fa-brands fa-pix"></i>
                                <span>Chave PIX do Favorecido</span>
                            </div>
                            <div className={styles.headerAcoesPix}>
                                <span className={`${styles.badgeTipoContato} ${styles['badge_' + (contatoAtivo.tipo || 'fornecedor')]}`}>
                                    {contatoAtivo.tipo === 'funcionario' ? 'Funcionário' : contatoAtivo.tipo === 'terceirizado' ? 'Terceirizado' : 'Fornecedor'}
                                </span>
                                {contatos && contatos.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.btnTrocarContato}
                                        onClick={() => setModoAlterarContato(!modoAlterarContato)}
                                        title="Trocar contato vinculado"
                                    >
                                        <i className="fa-solid fa-arrows-rotate"></i> {modoAlterarContato ? 'Fechar' : 'Trocar'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* DESTAQUE DO NOME DO BENEFICIÁRIO PARA CONFERÊNCIA ANTES DO PAGAMENTO */}
                        <div className={styles.beneficiarioInfo}>
                            <div className={styles.beneficiarioLabel}>
                                <i className="fa-solid fa-user-check"></i> Beneficiário cadastrado:
                            </div>
                            <div className={styles.beneficiarioNome}>
                                {contatoAtivo.nome}
                            </div>
                        </div>

                        {contatoAtivo.chave_pix ? (
                            <div className={styles.cardPixCorpo}>
                                <span className={styles.chavePixTexto} title={contatoAtivo.chave_pix}>
                                    {contatoAtivo.chave_pix}
                                </span>
                                <button
                                    type="button"
                                    className={`${styles.btnCopiarPixModal} ${pixCopiado ? styles.btnCopiadoModal : ''}`}
                                    onClick={copiarPix}
                                    title="Copiar Chave PIX"
                                >
                                    {pixCopiado ? (
                                        <>
                                            <i className="fa-solid fa-check"></i> Copiado!
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-copy"></i> Copiar PIX
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className={styles.avisoSemChavePix}>
                                <i className="fa-solid fa-circle-exclamation"></i> O contato {contatoAtivo.nome} não possui chave PIX cadastrada.
                            </div>
                        )}

                        {modoAlterarContato && (
                            <div className={styles.seletorTrocaContainer}>
                                <label className={styles.labelSeletor}>Mudar para outro contato da sua agenda:</label>
                                <select
                                    className={styles.selectTroca}
                                    value={contatoAtivo.id}
                                    onChange={(e) => {
                                        const novo = contatos.find(c => Number(c.id) === Number(e.target.value));
                                        if (novo) setContatoAtivo(novo);
                                        setModoAlterarContato(false);
                                    }}
                                >
                                    {contatos.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nome} {c.chave_pix ? `(PIX: ${c.chave_pix})` : '(Sem PIX)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={styles.avisoSeguranca}>
                            <i className="fa-solid fa-shield-halved"></i> Confira se o nome <strong>{contatoAtivo.nome}</strong> confere com o destinatário no aplicativo do seu banco antes de transferir.
                        </div>
                    </div>
                ) : (
                    <div className={styles.cardSemContato}>
                        <div className={styles.semContatoHeader}>
                            <div className={styles.semContatoTitulo}>
                                <i className="fa-solid fa-user-pen"></i>
                                <span>Favorecido avulso / Sem chave PIX</span>
                            </div>
                        </div>
                        <p className={styles.semContatoDesc}>
                            Esta conta foi cadastrada sem contato vinculado da sua agenda ("{conta.nome}").
                        </p>
                        {contatos && contatos.length > 0 && (
                            <div className={styles.vincularContatoRapido}>
                                <label className={styles.labelVincularRapido}>Deseja carregar o PIX de um contato cadastrado?</label>
                                <select
                                    className={styles.selectVincularRapido}
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (!e.target.value) return;
                                        const c = contatos.find(item => Number(item.id) === Number(e.target.value));
                                        if (c) setContatoAtivo(c);
                                    }}
                                >
                                    <option value="">Selecione um contato para exibir a chave PIX...</option>
                                    {contatos.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nome} {c.chave_pix ? `(PIX: ${c.chave_pix})` : '(Sem PIX)'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className={styles.linhaFormulario}>
                    <div className={styles.grupoInput}>
                        <label>Valor (R$)</label>
                        <input
                            type="number"
                            className={styles.inputModal}
                            value={valorPago}
                            onChange={(e) => setValorPago(e.target.value)}
                        />
                    </div>

                    <div className={styles.grupoInput}>
                        <label>Origem</label>
                        <select
                            className={styles.inputModal}
                            value={origem}
                            onChange={(e) => setOrigem(e.target.value)}
                        >
                            <option value="">Selecione...</option>
                            {carteiras.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.grupoInput}>
                        <label>Data</label>
                        <input
                            type="date"
                            className={styles.inputModal}
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.linhaCentralizada}>
                    <div className={styles.grupoInput} style={{ width: '200px' }}>
                        <label style={{textAlign: 'center'}}>Natureza</label>
                        <select
                            className={styles.inputModal}
                            value={natureza}
                            onChange={(e) => setNatureza(e.target.value)}
                        >
                            <option value="TOTAL">Total</option>
                            <option value="PARCIAL">Parcial</option>
                        </select>
                    </div>
                </div>

                {mensagem && (
                    <div className={styles[classeMensagem]}>
                        {mensagem}
                    </div>
                )}

                <button
                    className={styles.botaoConfirmar}
                    onClick={lidarComPagamento}
                    disabled={bloquearBotao}
                >
                    CONFIRMAR PAGAMENTO
                </button>

                <ModalMensagem
                    aberta={modalAlertaAberto}
                    tipo="aviso"
                    titulo="Origem Obrigatória"
                    mensagem="Por favor, selecione a carteira de origem para registrar este pagamento."
                    aoConfirmar={() => setModalAlertaAberto(false)}
                />
            </div>
        </div>
    );
}

export default ModalPagamento;