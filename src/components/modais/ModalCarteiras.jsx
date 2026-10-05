import { useState } from 'react';
import styles from '../../modules/ModalCarteiras.module.css';
import ModalMensagem from './ModalMensagem';

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

function parseValorBR(str) {
    if (typeof str === 'number') return str;
    if (!str) return NaN;
    let limpo = String(str).trim();
    if (limpo.includes('.') && limpo.includes(',')) {
        limpo = limpo.replace(/\./g, '').replace(',', '.');
    } else if (limpo.includes(',')) {
        limpo = limpo.replace(',', '.');
    }
    return parseFloat(limpo);
}

function ModalCarteiras({ aoFechar, carteiras = [], aoCriarCarteira, aoAjustarSaldo }) {
    const [mostrandoCriacao, setMostrandoCriacao] = useState(false);
    const [nome, setNome] = useState('');
    const [cor, setCor] = useState('#3E615B');
    const [saldoInicial, setSaldoInicial] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState('');

    // Estados para edição direta e confirmação de zerar
    const [carteiraEmEdicao, setCarteiraEmEdicao] = useState(null);
    const [valorNovoSaldo, setValorNovoSaldo] = useState('');
    const [carteiraParaZerar, setCarteiraParaZerar] = useState(null);
    const [salvandoAjuste, setSalvandoAjuste] = useState(false);

    // 1. Função para deixar o dinheiro bonito (R$ 0,00)
    const formatarBRL = (valor) => {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // 2. Calcular o Total de todas as carteiras juntas
    const totalGeral = carteiras.reduce((acumulador, item) => {
        return acumulador + Number(item.saldo || 0);
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

    // Iniciar edição inline de saldo
    const iniciarEdicao = (cart) => {
        setCarteiraEmEdicao(cart.id);
        setValorNovoSaldo(String(cart.saldo || '0'));
    };

    // Salvar novo saldo digitado diretamente
    const salvarEdicaoSaldo = async (cartId) => {
        const valorNum = parseValorBR(valorNovoSaldo);
        if (isNaN(valorNum)) {
            alert('Por favor, informe um valor de saldo válido.');
            return;
        }

        if (!aoAjustarSaldo) return;

        try {
            setSalvandoAjuste(true);
            await aoAjustarSaldo({
                carteira_id: cartId,
                novo_saldo: valorNum,
                motivo: 'Ajuste manual de saldo'
            });
            setCarteiraEmEdicao(null);
        } catch (err) {
            console.error("Erro ao ajustar saldo:", err);
        } finally {
            setSalvandoAjuste(false);
        }
    };

    // Confirmar zeramento após aceite no modal de confirmação
    const confirmarZerarCarteira = async () => {
        if (!carteiraParaZerar || !aoAjustarSaldo) return;

        try {
            setSalvandoAjuste(true);
            await aoAjustarSaldo({
                carteira_id: carteiraParaZerar.id,
                novo_saldo: 0,
                motivo: `Zeramento de saldo - ${carteiraParaZerar.nome}`
            });
            setCarteiraParaZerar(null);
        } catch (err) {
            console.error("Erro ao zerar carteira:", err);
        } finally {
            setSalvandoAjuste(false);
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

                    {carteiras.map(cart => {
                        const saldoNum = Number(cart.saldo || 0);
                        const estaNegativo = saldoNum < 0;
                        const estaEditando = carteiraEmEdicao === cart.id;

                        return (
                            <div key={cart.id} className={styles.itemCarteira} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={styles.nomeCarteira}>
                                        <i
                                            className={`fa-solid fa-wallet ${styles.iconeCarteira}`}
                                            style={{ color: cart.cor || '#888' }}
                                        ></i>
                                        {cart.nome}
                                    </span>

                                    <div className={styles.acoesItemCarteira}>
                                        <span className={estaNegativo ? styles.valorCarteiraNegativo : styles.valorCarteira}>
                                            {formatarBRL(cart.saldo)}
                                        </span>

                                        {aoAjustarSaldo && !estaEditando && (
                                            <>
                                                <button
                                                    type="button"
                                                    className={styles.btnEditarSaldo}
                                                    title="Editar o saldo desta carteira diretamente"
                                                    disabled={salvandoAjuste}
                                                    onClick={() => iniciarEdicao(cart)}
                                                >
                                                    <i className="fa-solid fa-pen"></i> Editar
                                                </button>

                                                {saldoNum !== 0 && (
                                                    <button
                                                        type="button"
                                                        className={styles.btnZerarItemCarteira}
                                                        title="Zerar o saldo desta carteira (definir para R$ 0,00)"
                                                        disabled={salvandoAjuste}
                                                        onClick={() => setCarteiraParaZerar(cart)}
                                                    >
                                                        <i className="fa-solid fa-rotate-left"></i> Zerar
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* FORMULÁRIO DE EDIÇÃO INLINE DO SALDO */}
                                {estaEditando && (
                                    <div className={styles.formEdicaoSaldo}>
                                        <input
                                            type="text"
                                            className={styles.inputEdicaoSaldo}
                                            placeholder="Novo saldo (R$)"
                                            autoFocus
                                            value={valorNovoSaldo}
                                            disabled={salvandoAjuste}
                                            onChange={(e) => setValorNovoSaldo(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') salvarEdicaoSaldo(cart.id);
                                                if (e.key === 'Escape') setCarteiraEmEdicao(null);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className={styles.btnSalvarEdicao}
                                            disabled={salvandoAjuste}
                                            onClick={() => salvarEdicaoSaldo(cart.id)}
                                        >
                                            {salvandoAjuste ? '...' : 'Salvar'}
                                        </button>
                                        <button
                                            type="button"
                                            className={styles.btnCancelarEdicao}
                                            disabled={salvandoAjuste}
                                            onClick={() => setCarteiraEmEdicao(null)}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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

            {/* MODAL DE CONFIRMAÇÃO PARA ZERAR SALDO */}
            <ModalMensagem
                aberta={!!carteiraParaZerar}
                tipo="confirmacao"
                perigoso={true}
                titulo="Zerar Saldo da Carteira"
                mensagem={`Tem certeza que deseja zerar o saldo de "${carteiraParaZerar?.nome}"? O saldo atual de ${formatarBRL(carteiraParaZerar?.saldo)} será definido para R$ 0,00.`}
                textoConfirmar="Sim, Zerar Saldo"
                textoCancelar="Cancelar"
                aoConfirmar={confirmarZerarCarteira}
                aoCancelar={() => setCarteiraParaZerar(null)}
            />
        </div>
    );
}

export default ModalCarteiras;