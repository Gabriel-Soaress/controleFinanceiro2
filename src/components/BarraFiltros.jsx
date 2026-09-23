import { useState } from 'react';
import styles from '../modules/BarraFiltros.module.css';

const MESES = [
    { label: 'Jan', valor: 1 },
    { label: 'Fev', valor: 2 },
    { label: 'Mar', valor: 3 },
    { label: 'Abr', valor: 4 },
    { label: 'Mai', valor: 5 },
    { label: 'Jun', valor: 6 },
    { label: 'Jul', valor: 7 },
    { label: 'Ago', valor: 8 },
    { label: 'Set', valor: 9 },
    { label: 'Out', valor: 10 },
    { label: 'Nov', valor: 11 },
    { label: 'Dez', valor: 12 },
];

const ANOS_DISPONIVEIS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

function BarraFiltros({ aoClicarEmFiltrar, opcoesCategorias = [], aoAbrirRelatorio, aoAbrirContatos }) {
    const anoAtual = new Date().getFullYear();
    const mesAtual = new Date().getMonth() + 1;

    const [ano, setAno] = useState(anoAtual);
    const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
    const [categoria, setCategoria] = useState('');
    const [busca, setBusca] = useState('');

    const calcularIntervaloDatas = (anoEscolhido, mesEscolhido) => {
        if (mesEscolhido === 'TODOS') {
            return {
                inicio: `${anoEscolhido}-01-01`,
                fim: `${anoEscolhido}-12-31`
            };
        }
        const mesPad = String(mesEscolhido).padStart(2, '0');
        const ultimoDia = new Date(anoEscolhido, mesEscolhido, 0).getDate();
        return {
            inicio: `${anoEscolhido}-${mesPad}-01`,
            fim: `${anoEscolhido}-${mesPad}-${String(ultimoDia).padStart(2, '0')}`
        };
    };

    const dispararFiltro = (anoFiltro, mesFiltro, catFiltro, textoFiltro) => {
        const { inicio, fim } = calcularIntervaloDatas(anoFiltro, mesFiltro);
        aoClicarEmFiltrar({
            ano: anoFiltro,
            mes: mesFiltro,
            inicio,
            fim,
            categoria: catFiltro,
            texto: textoFiltro
        });
    };

    const lidarComTrocaMes = (novoMes) => {
        setMesSelecionado(novoMes);
        dispararFiltro(ano, novoMes, categoria, busca);
    };

    const lidarComTrocaAno = (novoAno) => {
        const anoNum = Number(novoAno);
        setAno(anoNum);
        dispararFiltro(anoNum, mesSelecionado, categoria, busca);
    };

    const lidarComCliqueFiltrar = () => {
        dispararFiltro(ano, mesSelecionado, categoria, busca);
    };

    return (
        <div className={styles.containerBarraFiltros}>

            {/* LINHA 1: SELEÇÃO DE ANO (ACIMA) E BOTÃO DE RELATÓRIO PARA IMPRESSÃO */}
            <div className={styles.linhaAno}>
                <div className={styles.grupoAnoEsquerda}>
                    <span className={styles.labelAno}>
                        <i className={`fa-solid fa-calendar-days ${styles.iconeAno}`}></i>
                        ANO
                    </span>
                    <div className={styles.wrapperAno}>
                        <select
                            className={styles.campoAno}
                            value={ano}
                            onChange={(e) => lidarComTrocaAno(e.target.value)}
                        >
                            {ANOS_DISPONIVEIS.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className={styles.grupoBotoesAcao}>
                    {aoAbrirContatos && (
                        <button
                            type="button"
                            className={styles.botaoContatos}
                            onClick={aoAbrirContatos}
                            title="Gerenciar rede de fornecedores, funcionários e terceirizados"
                        >
                            <i className="fa-solid fa-address-book"></i>
                            Rede de Contatos
                        </button>
                    )}

                    {aoAbrirRelatorio && (
                        <button
                            type="button"
                            className={styles.botaoRelatorio}
                            onClick={aoAbrirRelatorio}
                            title="Gerar e imprimir relatório financeiro completo deste mês"
                        >
                            <i className="fa-solid fa-print"></i>
                            Relatório para Impressão
                        </button>
                    )}
                </div>
            </div>

            {/* LINHA 2: MESES NA LINHA DE BAIXO E O 'TODOS' SEPARADO AO FINAL DA LINHA */}
            <div className={styles.linhaMeses}>
                <div className={styles.grupoMeses}>
                    {MESES.map((m) => (
                        <button
                            key={m.valor}
                            type="button"
                            className={`${styles.botaoMes} ${mesSelecionado === m.valor ? styles.botaoMesAtivo : ''}`}
                            onClick={() => lidarComTrocaMes(m.valor)}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className={styles.wrapperTodos}>
                    <div className={styles.divisorVertical}></div>
                    <button
                        type="button"
                        className={`${styles.botaoMes} ${styles.botaoTodos} ${mesSelecionado === 'TODOS' ? styles.botaoMesAtivo : ''}`}
                        onClick={() => lidarComTrocaMes('TODOS')}
                        title="Ver o ano inteiro"
                    >
                        Todos
                    </button>
                </div>
            </div>

            {/* LINHA 3: CATEGORIA + BUSCA INTELIGENTE (TEXTO OU NÚMERO) + BOTÃO FILTRAR */}
            <div className={styles.linhaFiltros}>
                <select
                    className={styles.campoSelecao}
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                >
                    <option value="">CATEGORIAS</option>
                    {opcoesCategorias.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.nome}
                        </option>
                    ))}
                </select>

                <div className={styles.wrapperBusca}>
                    <i className={`fa-solid fa-magnifying-glass ${styles.iconeBusca}`}></i>
                    <input
                        type="text"
                        className={styles.campoBusca}
                        placeholder="Pesquisar por nome, descrição, boleto ou valor..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') lidarComCliqueFiltrar();
                        }}
                    />
                </div>

                <button
                    className={styles.botaoFiltrar}
                    onClick={lidarComCliqueFiltrar}
                >
                    <i className="fa-solid fa-filter"></i>
                    filtrar
                </button>

            </div>

        </div>
    );
}

export default BarraFiltros;