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

    // Busca se a conta pertence a um contato registrado com chave PIX
    const contatoRegistrado = useMemo(() => {
        if (!conta || !conta.nome || !contatos || contatos.length === 0) return null;
        const nomeConta = (conta.nome || '').trim().toUpperCase();

        // 1. Correspondência exata
        let match = contatos.find(c => (c.nome || '').trim().toUpperCase() === nomeConta);
        if (match && match.chave_pix) return match;

        // 2. Correspondência parcial inteligente
        match = contatos.find(c => {
            const cNome = (c.nome || '').trim().toUpperCase();
            return cNome && (nomeConta.includes(cNome) || cNome.includes(nomeConta));
        });
        if (match && match.chave_pix) return match;

        return null;
    }, [conta, contatos]);

    const copiarPix = () => {
        if (!contatoRegistrado?.chave_pix) return;
        navigator.clipboard.writeText(contatoRegistrado.chave_pix);
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

                {contatoRegistrado && contatoRegistrado.chave_pix && (
                    <div className={styles.cardPix}>
                        <div className={styles.cardPixHeader}>
                            <div className={styles.cardPixTitulo}>
                                <i className="fa-brands fa-pix"></i>
                                <span>Chave PIX Cadastrada</span>
                            </div>
                            <span className={`${styles.badgeTipoContato} ${styles['badge_' + (contatoRegistrado.tipo || 'fornecedor')]}`}>
                                {contatoRegistrado.tipo === 'funcionario' ? 'Funcionário' : contatoRegistrado.tipo === 'terceirizado' ? 'Terceirizado' : 'Fornecedor'}
                            </span>
                        </div>
                        <div className={styles.cardPixCorpo}>
                            <span className={styles.chavePixTexto} title={contatoRegistrado.chave_pix}>
                                {contatoRegistrado.chave_pix}
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