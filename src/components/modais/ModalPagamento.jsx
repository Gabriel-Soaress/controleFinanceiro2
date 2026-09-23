import { useState, useEffect } from 'react';
import styles from '../../modules/ModalPagamentos.module.css';
import ModalMensagem from './ModalMensagem';

// 1. Adicionada a prop 'aoConfirmar' aqui no topo
function ModalPagamento({ conta, aoFechar, carteiras = [], aoConfirmar }) {

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