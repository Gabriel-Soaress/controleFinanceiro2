import styles from '../modules/ResumoFiltros.module.css';

function ResumoFiltros({ entradas = 0, saidas = 0, emAberto = 0 }) {

    // Calculamos o saldo aqui mesmo
    const saldo = entradas - saidas;

    // Lógica para definir a cor e o ícone do centro (Dinâmico)
    const obterEstiloSaldo = () => {
        if (saldo > 0) {
            return {
                classeCor: styles.textoVerde,
                icone: "fa-chevron-up"
            };
        } else if (saldo < 0) {
            return {
                classeCor: styles.textoVermelho,
                icone: "fa-chevron-down"
            };
        } else {
            return {
                classeCor: styles.textoNeutro,
                icone: "fa-minus"
            };
        }
    };

    const estiloSaldo = obterEstiloSaldo();

    // Função auxiliar para formatar dinheiro (R$ 1.000,00)
    const formatarMoeda = (valor) => {
        return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div className={styles.containerResumo}>

            {/* BLOCO 1: ENTRADAS (Sempre Verde) */}
            <div className={styles.bloco}>
                <span className={styles.titulo}>Entradas no período:</span>
                <div className={`${styles.valor} ${styles.textoVerde}`}>
                    {formatarMoeda(entradas)}
                    <i className={`fa-solid fa-chevron-up ${styles.icone}`}></i>
                </div>
            </div>

            <div className={styles.divisor}></div>

            {/* BLOCO 2: BALANÇO (Dinâmico) */}
            <div className={styles.bloco}>
                <span className={styles.titulo}>Balanço (entradas - saídas)</span>
                <div className={`${styles.valor} ${estiloSaldo.classeCor}`}>
                    {formatarMoeda(saldo)}
                    <i className={`fa-solid ${estiloSaldo.icone} ${styles.icone}`}></i>
                </div>
            </div>

            <div className={styles.divisor}></div>

            {/* BLOCO 3: SAÍDAS (Sempre Vermelho) */}
            <div className={styles.bloco}>
                <span className={styles.titulo}>Saídas no período</span>
                <div className={`${styles.valor} ${styles.textoVermelho}`}>
                    {formatarMoeda(saidas)}
                    <i className={`fa-solid fa-chevron-down ${styles.icone}`}></i>
                </div>
            </div>

            <div className={styles.divisor}></div>

            {/* BLOCO 4: CONTAS EM ABERTO NO PERÍODO (Âmbar) */}
            <div className={styles.bloco}>
                <span className={styles.titulo}>Em aberto no período</span>
                <div className={`${styles.valor} ${styles.textoAmbar}`}>
                    {formatarMoeda(emAberto)}
                    <i className={`fa-solid fa-clock ${styles.icone}`}></i>
                </div>
            </div>

        </div>
    );
}

export default ResumoFiltros;