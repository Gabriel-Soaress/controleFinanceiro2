import { useState } from 'react';
import styles from '../../modules/ModalCarteiras.module.css';

const CORES_PALETA = [
    '#3E615B', // Verde escuro original
    '#E91E63', // Rosa vibrante original
    '#311B92', // Roxo profundo
    '#1E88E5', // Azul royal
    '#00897B', // Turquesa
    '#FB8C00', // Laranja
    '#E53935', // Vermelho
    '#5E35B1', // Violeta
];

function ModalCarteiras({ aoFechar, carteiras = [], aoCriarCarteira }) {
    const [mostrandoCriacao, setMostrandoCriacao] = useState(false);
    const [nome, setNome] = useState('');
    const [cor, setCor] = useState('#3E615B');
    const [saldoInicial, setSaldoInicial] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    // 1. Função para deixar o dinheiro bonito (R$ 0,00)
    const formatarBRL = (valor) => {
        return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // 2. Calcular o Total de todas as carteiras juntas
    const totalGeral = carteiras.reduce((acumulador, item) => {
        return acumulador + Number(item.saldo);
    }, 0);

    const lidarComSalvar = async (e) => {
        e.preventDefault();
        setErro('');

        if (!nome.trim()) {
            setErro('Por favor, informe o nome da carteira.');
            return;
        }

        try {
            setSalvando(true);
            if (aoCriarCarteira) {
                await aoCriarCarteira({
                    nome: nome.trim(),
                    cor: cor,
                    saldo_inicial: parseFloat(saldoInicial) || 0
                });
            }
            // Limpa o formulário e volta para a lista
            setNome('');
            setCor('#3E615B');
            setSaldoInicial('');
            setMostrandoCriacao(false);
        } catch (err) {
            setErro('Erro ao salvar carteira. Tente novamente.');
            console.error(err);
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={`${styles.modalBox} ${styles.boxPequeno}`}>
                <button className={styles.botaoFechar} onClick={aoFechar}>×</button>

                <h2 className={styles.titulo}>Minhas Carteiras</h2>

                {/* Lista de Carteiras */}
                <div className={styles.listaCarteiras}>
                    {carteiras.length === 0 && (
                        <p style={{ textAlign: 'center', padding: '15px', color: '#888' }}>
                            Nenhuma carteira encontrada.
                        </p>
                    )}

                    {carteiras.map(cart => (
                        <div key={cart.id} className={styles.itemCarteira}>
                            <span className={styles.nomeCarteira}>
                                <i
                                    className={`fa-solid fa-wallet ${styles.iconeCarteira}`}
                                    style={{ color: cart.cor || '#888' }}
                                ></i>
                                {cart.nome}
                            </span>

                            <span className={styles.valorCarteira}>
                                {formatarBRL(cart.saldo)}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Formulário de Nova Carteira ou Botão para Abrir */}
                {mostrandoCriacao ? (
                    <form className={styles.formNovaCarteira} onSubmit={lidarComSalvar}>
                        <h4 className={styles.formTitulo}>Adicionar Nova Carteira</h4>

                        <div className={styles.grupoInput}>
                            <label className={styles.labelInput}>Nome da Carteira *</label>
                            <input
                                type="text"
                                className={styles.inputTexto}
                                placeholder="Ex: Nubank, Inter, Caixa Física..."
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className={styles.grupoInput}>
                            <label className={styles.labelInput}>Cor de Identificação</label>
                            <div className={styles.containerCores}>
                                {CORES_PALETA.map((corOpcao) => (
                                    <div
                                        key={corOpcao}
                                        className={`${styles.circuloCor} ${cor === corOpcao ? styles.circuloCorSelecionada : ''}`}
                                        style={{ backgroundColor: corOpcao }}
                                        onClick={() => setCor(corOpcao)}
                                    />
                                ))}
                                <input
                                    type="color"
                                    className={styles.inputColorCustom}
                                    value={cor}
                                    onChange={(e) => setCor(e.target.value)}
                                    title="Escolher outra cor personalizada"
                                />
                            </div>
                        </div>

                        <div className={styles.grupoInput}>
                            <label className={styles.labelInput}>Saldo Inicial (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className={styles.inputTexto}
                                placeholder="0,00"
                                value={saldoInicial}
                                onChange={(e) => setSaldoInicial(e.target.value)}
                            />
                        </div>

                        {erro && (
                            <p style={{ color: '#ff5252', fontSize: '0.8rem', margin: 0 }}>
                                {erro}
                            </p>
                        )}

                        <div className={styles.acoesForm}>
                            <button
                                type="submit"
                                className={styles.btnSalvarCarteira}
                                disabled={salvando || !nome.trim()}
                            >
                                {salvando ? 'Salvando...' : 'Salvar Carteira'}
                            </button>
                            <button
                                type="button"
                                className={styles.btnCancelarForm}
                                onClick={() => {
                                    setMostrandoCriacao(false);
                                    setErro('');
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                ) : (
                    <button
                        className={styles.btnNovaCarteira}
                        onClick={() => setMostrandoCriacao(true)}
                    >
                        <i className="fa-solid fa-plus"></i>
                        Nova Carteira
                    </button>
                )}

                {/* Rodapé do Total SOMADO */}
                <div className={styles.totalCarteiras}>
                    Total em contas: <b>{formatarBRL(totalGeral)}</b>
                </div>
            </div>
        </div>
    );
}

export default ModalCarteiras;