import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import CardLogin from './components/CardLogin';
import Header from './components/Header';

function App() {
    const [usuarioLogado, setUsuarioLogado] = useState(null);
    const [tema, setTema] = useState(() => {
        return localStorage.getItem('tema_dfashion') || 'escuro';
    });

    useEffect(() => {
        const usuarioSalvo = localStorage.getItem('usuario_sofit');
        if (usuarioSalvo) {
            setUsuarioLogado(JSON.parse(usuarioSalvo));
        }
    }, []);

    // Sincroniza a classe do corpo do documento com o tema ativo
    useEffect(() => {
        if (tema === 'claro') {
            document.body.classList.add('modo-claro');
        } else {
            document.body.classList.remove('modo-claro');
        }
        localStorage.setItem('tema_dfashion', tema);
    }, [tema]);

    const alternarTema = () => {
        setTema((prev) => (prev === 'escuro' ? 'claro' : 'escuro'));
    };

    const salvarLogin = (dadosUsuario) => {
        localStorage.setItem('usuario_sofit', JSON.stringify(dadosUsuario));
        setUsuarioLogado(dadosUsuario);
    };

    const sair = () => {
        localStorage.removeItem('usuario_sofit');
        setUsuarioLogado(null);
    };

    // --- RENDERIZAÇÃO ---

    // 1. TELA DE LOGIN
    if (!usuarioLogado) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: tema === 'claro' ? '#f1f5f9' : '#0b0f19',
                transition: 'background-color 0.3s ease'
            }}>
                <CardLogin aoFazerLogin={salvarLogin} />
            </div>
        );
    }

    // 2. TELA DO SISTEMA
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: tema === 'claro' ? '#f1f5f9' : '#0b0f19',
            transition: 'background-color 0.3s ease'
        }}>
            <Header
                aoSair={sair}
                tema={tema}
                aoAlternarTema={alternarTema}
            />

            <Dashboard usuarioId={usuarioLogado.id} tema={tema} />
        </div>
    );
}

export default App;