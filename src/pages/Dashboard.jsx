import { useState, useEffect } from 'react';

// IMPORTAÇÃO DOS COMPONENTES
import BalanceCard from '../components/MostrarBalancoAtual';
import BarraFiltros from '../components/BarraFiltros';
import ResumoFiltros from '../components/ResumoFiltros';
import TabelaContas from '../components/TabelaContas';


// IMPORTAÇÃO DOS MODAIS E PÁGINAS
import ModalPagamento from '../components/modais/ModalPagamento';
import ModalAdicionarSaldo from '../components/modais/ModalAdicionarSaldo';
import ModalCarteiras from '../components/modais/ModalCarteiras';
import ModalMensagem from '../components/modais/ModalMensagem';
import RelatorioImpressao from './RelatorioImpressao';
import Contatos from './Contatos';

import { API_BASE_URL } from '../services/api';

const traduzirConta = (item) => ({
    ...item,
    numero_boleto: item.referencia,
    emissao: item.data_emissao ? item.data_emissao.split('T')[0] : '',
    vencimento: item.data_vencimento ? item.data_vencimento.split('T')[0] : '',
    data_pagamento: item.data_pagamento ? item.data_pagamento.split('T')[0] : ''
});

function Dashboard({ usuarioId, tema = 'escuro' }) {
    // 1. ESTADOS VISUAIS (Controle dos Modais e Telas)
    const [telaAtual, setTelaAtual] = useState('dashboard'); // 'dashboard' | 'relatorio' | 'contatos'
    const [modalSaldoAberto, setModalSaldoAberto] = useState(false);
    const [modalCarteirasAberto, setModalCarteirasAberto] = useState(false);
    const [contaParaPagar, setContaParaPagar] = useState(null);

    // Modal Universal para Notificações e Confirmações
    const [modalMsg, setModalMsg] = useState({
        aberta: false,
        tipo: 'aviso',
        titulo: '',
        mensagem: '',
        perigoso: false,
        textoConfirmar: 'OK',
        aoConfirmar: null
    });

// 2. ESTADOS DE DADOS (Começam Vazios)
    const [listaCategorias, setListaCategorias] = useState([]);
    const [minhasCarteiras, setMinhasCarteiras] = useState([]);
    const [listaContas, setListaContas] = useState([]);
    const [listaContatos, setListaContatos] = useState([]);

// --- NOVOS ESTADOS DOS FILTROS ---
    const anoAtualPadrao = new Date().getFullYear();
    const mesAtualPadrao = new Date().getMonth() + 1;
    const mesPadraoFormatado = String(mesAtualPadrao).padStart(2, '0');
    const ultimoDiaPadrao = new Date(anoAtualPadrao, mesAtualPadrao, 0).getDate();

    const [filtros, setFiltros] = useState({
        ano: anoAtualPadrao,
        mes: mesAtualPadrao,
        inicio: `${anoAtualPadrao}-${mesPadraoFormatado}-01`,
        fim: `${anoAtualPadrao}-${mesPadraoFormatado}-${String(ultimoDiaPadrao).padStart(2, '0')}`,
        categoria: '',
        texto: ''
    });

    const [resumoValores, setResumoValores] = useState({
        entradas: 0,
        saidas: 0
    });

    const saldoTotal = minhasCarteiras.reduce((acumulator, item) =>{
        return acumulator + Number(item.saldo);
    },0);

    const totalDividas = listaContas
        .filter(c => c.status !== 'PAGO')
        .reduce((acc, item) => acc + Number(item.valor),0);

// O EFEITO (Gatilho inicial)
    useEffect(() => {
        async function buscarDados() {
            // SEGURANÇA: Se não tiver ID (usuário deslogado), não busca nada pra não dar erro
            if (!usuarioId) return;

            try {
                // CABEÇALHO PADRÃO COM O ID DO USUÁRIO
                const headers = { 'user-id': usuarioId };

                // --- PARTE 1: BUSCAR CATEGORIAS ---
                const respostaCat = await fetch(`${API_BASE_URL}/categorias`, { headers });
                if (!respostaCat.ok) throw new Error('Erro ao buscar categorias');
                const dadosCat = await respostaCat.json();
                setListaCategorias(dadosCat);

                // --- PARTE 2: BUSCAR CONTAS ---
                const respostaContas = await fetch(`${API_BASE_URL}/contas`, { headers });
                if (!respostaContas.ok) throw new Error('Erro ao buscar contas');
                const dadosContasBrutos = await respostaContas.json();

                // --- PARTE 3: A TRADUÇÃO ---
                const contasTraduzidas = dadosContasBrutos.map(traduzirConta);
                setListaContas(contasTraduzidas);

                // --- PARTE 4: CARTEIRAS ---
                const res3 = await fetch(`${API_BASE_URL}/carteiras`, { headers });
                if (res3.ok) {
                    const dadosCarteiras = await res3.json();
                    setMinhasCarteiras(dadosCarteiras);
                }

                // --- PARTE 5: CONTATOS ---
                const resContatos = await fetch(`${API_BASE_URL}/contatos`, { headers });
                if (resContatos.ok) {
                    const dadosContatos = await resContatos.json();
                    setListaContatos(dadosContatos);
                }

            } catch (erro) {
                console.error("Erro ao buscar dados:", erro);
            }
        }

        buscarDados();
        // Adicionamos usuarioId na dependência: se mudar o usuário, recarrega tudo
    }, [usuarioId]);

    const recarregarContatos = async () => {
        if (!usuarioId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/contatos`, { headers: { 'user-id': usuarioId } });
            if (res.ok) {
                const dados = await res.json();
                setListaContatos(dados);
            }
        } catch (e) {
            console.error('Erro ao recarregar contatos:', e);
        }
    };


// --- CÁLCULO DO RESUMO (ENTRADAS E SAÍDAS) ---
    useEffect(() => {
        async function calcularResumo() {
            if (!usuarioId) return;

            try {
                const url = `${API_BASE_URL}/movimentacoes?inicio=${filtros.inicio}&fim=${filtros.fim}`;

                // AQUI TAMBÉM PRECISA DO HEADER AGORA!
                const res = await fetch(url, { headers: { 'user-id': usuarioId } });
                const movs = await res.json();

                // Soma apenas o que for tipo 'ENTRADA' e não for estorno
                const totalEntradas = movs
                    .filter(m =>
                        m.tipo === 'ENTRADA' &&
                        !m.descricao.toLowerCase().includes('estorno')
                    )
                    .reduce((acc, m) => acc + Number(m.valor), 0);

                // Calcular SAÍDAS: Contas que foram pagas no período selecionado
                const totalSaidas = listaContas
                    .filter(c => {
                        if (c.status !== 'PAGO') return false;
                        const dataPag = c.data_pagamento || c.emissao || c.vencimento;
                        const bateData = (!filtros.inicio || dataPag >= filtros.inicio) &&
                                         (!filtros.fim || dataPag <= filtros.fim);
                        return bateData;
                    })
                    .reduce((acc, c) => acc + Number(c.valor_original), 0);

                setResumoValores({ entradas: totalEntradas, saidas: totalSaidas });

            } catch (erro) {
                console.error("Erro ao calcular resumo:", erro);
            }
        }

        calcularResumo();
    }, [filtros, listaContas, usuarioId]); // Adicionado usuarioId


// 3. FUNÇÕES DE AÇÃO (TODAS COM HEADER AGORA)

    const criarConta = async (novaConta) => {
        try {
            const resposta = await fetch(`${API_BASE_URL}/contas`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': usuarioId // <--- IMPORTANTE
                },
                body: JSON.stringify(novaConta)
            });

            if (!resposta.ok) throw new Error('Erro ao salvar conta');
            const contaVindaDoBanco = await resposta.json();
            const contaTraduzida = traduzirConta(contaVindaDoBanco);

            setListaContas((listaAtual) => [...listaAtual, contaTraduzida]);

        } catch (erro) {
            console.error("Erro ao criar conta:", erro);
        }
    };

    const excluirConta = async (id) =>{
        try{
            // DELETE também precisa de header pra saber se a conta é sua
            const resposta = await fetch(`${API_BASE_URL}/contas/${id}`,{
                method: 'DELETE',
                headers: { 'user-id': usuarioId }
            });

            if (!resposta.ok) throw new Error('Erro ao excluir conta');
            setListaContas((listaAtual) => listaAtual.filter(item => item.id !== id));
        } catch (erro) {
            console.error("Erro ao excluir conta",erro);
        }
    };

    const editarConta = async (contaEditada) => {
        try {
            const resposta = await fetch(`${API_BASE_URL}/contas/${contaEditada.id}`,{
                method: 'PUT',
                headers:{
                    'Content-Type': 'application/json',
                    'user-id': usuarioId // <--- IMPORTANTE
                },
                body: JSON.stringify(contaEditada)
            });

            if (!resposta.ok) throw new Error('Erro ao editar conta');
            const contaVindaDobanco = await resposta.json();
            const contaTraduzida = traduzirConta(contaVindaDobanco);

            setListaContas((listaAtual) => listaAtual.map(item => item.id === contaEditada.id ? contaTraduzida : item));

            setListaContas((listaAtual) => listaAtual.map(item => item.id === contaEditada.id ? contaTraduzida : item));
        }catch(erro) {
            console.error("Erro ao editar conta",erro);
        }
    };

    const adicionarSaldo = async (dadosDoModal) => {
        try {
            const resposta = await fetch(`${API_BASE_URL}/movimentacoes/entrada`,{
                method: 'POST',
                headers:{
                    'Content-Type': 'application/json',
                    'user-id': usuarioId // <--- IMPORTANTE
                },
                body: JSON.stringify(dadosDoModal)
            });

            if(!resposta.ok) throw new Error('Erro ao depositar');

            const resCarteiras = await fetch(`${API_BASE_URL}/carteiras`, { headers: { 'user-id': usuarioId } });
            setMinhasCarteiras(await resCarteiras.json());

            // Atualizar resumo também
            const resumoFake = {...filtros}; // Truque pra forçar re-render do resumo
            setFiltros(resumoFake);

            console.log("Saldo Adicionado com sucesso!");
        }catch(erro) {
            console.error(erro);
        }
    };

    const criarCarteira = async (novaCarteira) => {
        try {
            const resposta = await fetch(`${API_BASE_URL}/carteiras`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': usuarioId
                },
                body: JSON.stringify(novaCarteira)
            });

            if (!resposta.ok) {
                const dadosErro = await resposta.json().catch(() => ({}));
                throw new Error(dadosErro.erro || 'Erro ao criar carteira');
            }

            const carteiraCriada = await resposta.json();
            setMinhasCarteiras((listaAtual) => [...listaAtual, carteiraCriada]);

            // Se teve saldo inicial adicionado, atualiza o resumo
            if (novaCarteira.saldo_inicial > 0) {
                setFiltros(filtrosAtuais => ({ ...filtrosAtuais }));
            }

            return carteiraCriada;
        } catch (erro) {
            console.error("Erro ao criar carteira:", erro);
            throw erro;
        }
    };

    const abrirModalPagamento = (conta) => {
        setContaParaPagar(conta);
    };

    const efetuarPagamento = async (dados) => {
        try {
            const resposta = await fetch(`${API_BASE_URL}/contas/pagar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'user-id': usuarioId // <--- IMPORTANTE
                },
                body: JSON.stringify(dados)
            });

            if (!resposta.ok) throw new Error('Erro ao processar pagamento');

            const resContas = await fetch(`${API_BASE_URL}/contas`, { headers: { 'user-id': usuarioId } });
            const dadosContas = await resContas.json();
            const contasTraduzidas = dadosContas.map(traduzirConta);
            setListaContas(contasTraduzidas);

            const resCarteiras = await fetch(`${API_BASE_URL}/carteiras`, { headers: { 'user-id': usuarioId } });
            setMinhasCarteiras(await resCarteiras.json());

        } catch (erro) {
            console.error("Erro no pagamento:", erro);
        }
    };

    const estornarConta = (idConta) => {
        setModalMsg({
            aberta: true,
            tipo: 'confirmacao',
            titulo: 'Desfazer Pagamento',
            mensagem: 'Deseja realmente estornar este pagamento? A conta retornará como pendente e o saldo será ajustado na carteira.',
            perigoso: true,
            textoConfirmar: 'Sim, Estornar',
            aoConfirmar: async () => {
                setModalMsg(prev => ({ ...prev, aberta: false }));
                try {
                    const resposta = await fetch(`${API_BASE_URL}/contas/estornar`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'user-id': usuarioId // <--- IMPORTANTE
                        },
                        body: JSON.stringify({ conta_id: idConta })
                    });

                    if (resposta.ok) {
                        const resContas = await fetch(`${API_BASE_URL}/contas`, { headers: { 'user-id': usuarioId } });
                        const dadosContas = await resContas.json();
                        const contasTraduzidas = dadosContas.map(traduzirConta);
                        setListaContas(contasTraduzidas);

                        const resCarteiras = await fetch(`${API_BASE_URL}/carteiras`, { headers: { 'user-id': usuarioId } });
                        setMinhasCarteiras(await resCarteiras.json());

                        setModalMsg({
                            aberta: true,
                            tipo: 'sucesso',
                            titulo: 'Estorno Realizado',
                            mensagem: 'O pagamento foi desfeito com sucesso e o saldo foi creditado novamente na carteira.',
                            perigoso: false,
                            aoConfirmar: () => setModalMsg(prev => ({ ...prev, aberta: false }))
                        });
                    } else {
                        setModalMsg({
                            aberta: true,
                            tipo: 'erro',
                            titulo: 'Erro no Servidor',
                            mensagem: 'Ocorreu um erro no servidor ao estornar a conta.',
                            perigoso: false,
                            aoConfirmar: () => setModalMsg(prev => ({ ...prev, aberta: false }))
                        });
                    }
                } catch (erro) {
                    console.error("Erro ao estornar:", erro);
                    setModalMsg({
                        aberta: true,
                        tipo: 'erro',
                        titulo: 'Erro de Conexão',
                        mensagem: 'Não foi possível se comunicar com o servidor para realizar o estorno.',
                        perigoso: false,
                        aoConfirmar: () => setModalMsg(prev => ({ ...prev, aberta: false }))
                    });
                }
            }
        });
    };

    const contasFiltradasParaExibir = listaContas.filter(conta => {
        // REGRA DE DATAS:
        // - A conta a pagar (pendente/parcial) fica atrelada ao mês de CADASTRO (emissao).
        //   Mesmo que o vencimento seja no mês seguinte, ela continua no mês de cadastro até ser quitada.
        // - Quando a conta for PAGA, ela é registrada e exibida no mês em que foi PAGA (data_pagamento).
        const dataReferencia = conta.status === 'PAGO'
            ? (conta.data_pagamento || conta.emissao || conta.vencimento)
            : (conta.emissao || conta.vencimento);

        const bateData = (!filtros.inicio || dataReferencia >= filtros.inicio) &&
                         (!filtros.fim || dataReferencia <= filtros.fim);

        const bateCategoria = filtros.categoria === '' || String(conta.categoria_id) === String(filtros.categoria);

        const buscaMinusculo = (filtros.texto || '').trim().toLowerCase();
        const bateBusca = !buscaMinusculo ||
            (conta.nome && conta.nome.toLowerCase().includes(buscaMinusculo)) ||
            (conta.descricao && conta.descricao.toLowerCase().includes(buscaMinusculo)) ||
            (conta.numero_boleto && String(conta.numero_boleto).toLowerCase().includes(buscaMinusculo)) ||
            (conta.referencia && String(conta.referencia).toLowerCase().includes(buscaMinusculo)) ||
            (conta.valor && String(conta.valor).toLowerCase().includes(buscaMinusculo)) ||
            (conta.valor_original && String(conta.valor_original).toLowerCase().includes(buscaMinusculo)) ||
            (conta.id && String(conta.id) === buscaMinusculo);

        return bateData && bateCategoria && bateBusca;
    });

    if (telaAtual === 'relatorio') {
        return (
            <RelatorioImpressao
                usuarioId={usuarioId}
                anoInicial={filtros.ano || anoAtualPadrao}
                mesInicial={filtros.mes || mesAtualPadrao}
                contas={listaContas}
                carteiras={minhasCarteiras}
                categorias={listaCategorias}
                aoVoltar={() => setTelaAtual('dashboard')}
            />
        );
    }

    if (telaAtual === 'contatos') {
        return (
            <Contatos
                usuarioId={usuarioId}
                tema={tema}
                aoVoltar={() => {
                    setTelaAtual('dashboard');
                    recarregarContatos();
                }}
            />
        );
    }

    return (
        <div style={{ padding: '20px 24px 60px 24px', backgroundColor: 'transparent', minHeight: '100vh' }}>

            <BalanceCard
                despesas={totalDividas}
                caixa={saldoTotal}
                aoClicarAdicionar={() => setModalSaldoAberto(true)}
                aoClicarCarteiras={() => setModalCarteirasAberto(true)}
            />

            {/* 1. BARRA DE FILTROS COM BOTÃO DE RELATÓRIO E CONTATOS INTEGRADOS */}
            <BarraFiltros
                opcoesCategorias={listaCategorias}
                aoClicarEmFiltrar={(novosDados) => setFiltros(prev => ({ ...prev, ...novosDados }))}
                aoAbrirRelatorio={() => setTelaAtual('relatorio')}
                aoAbrirContatos={() => setTelaAtual('contatos')}
            />

            {/* 2. RESUMO DOS FILTROS */}
            {/* Passamos os valores calculados no Passo 4 */}
            <ResumoFiltros
                entradas={resumoValores.entradas}
                saidas={resumoValores.saidas}
            />

            {/* 3. TABELA DE CONTAS */}
            {/* Passamos contatos para sugestão / autocomplete em tempo real */}
            <TabelaContas
                categorias={listaCategorias}
                dados={contasFiltradasParaExibir}
                contatos={listaContatos}
                aoClicarPagar={abrirModalPagamento}
                aoSalvarNovaConta={criarConta}
                aoSalvarEdicao={editarConta}
                aoExcluirConta={excluirConta}
                aoClicarEstornar={estornarConta}
            />

            {/* --- ÁREA DOS MODAIS --- */}

            {contaParaPagar && (
                <ModalPagamento
                    conta={contaParaPagar}
                    carteiras={minhasCarteiras}
                    aoFechar={() => setContaParaPagar(null)}
                    aoConfirmar={efetuarPagamento}
                />
            )}

            {modalSaldoAberto && (
                <ModalAdicionarSaldo
                    carteiras={minhasCarteiras}
                    aoSalvar={adicionarSaldo}
                    aoFechar={() => setModalSaldoAberto(false)}
                />
            )}

            {modalCarteirasAberto && (
                <ModalCarteiras
                    carteiras={minhasCarteiras}
                    aoCriarCarteira={criarCarteira}
                    aoFechar={() => setModalCarteirasAberto(false)}
                />
            )}

            {/* MODAL UNIVERSAL PARA MENSAGENS E CONFIRMAÇÕES */}
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
    )
}

export default Dashboard;

