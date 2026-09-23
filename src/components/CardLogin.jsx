import { useState } from 'react';
import styles from '../modules/CardLogin.module.css';
import { API_BASE_URL } from '../services/api';

function CardLogin({ aoFazerLogin }) { // Recebemos a função do pai
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erro, setErro] = useState('');

    const alternarVisibilidade = () => setMostrarSenha(!mostrarSenha);

    const entrar = async () => {
        setErro(''); // Limpa erros antigos

        try {
            const resposta = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            if (resposta.ok) {
                const usuario = await resposta.json();
                // SUCESSO! Manda os dados lá pro App.js
                aoFazerLogin(usuario);
            } else {
                setErro('Email ou senha incorretos!');
            }
        } catch (e) {
            setErro('Erro de conexão com o servidor.');
        }
    };

    return (
        <div className={styles.card}>
            <h1 className={styles.title}>login</h1>

            <div className={styles.inputGroup}>
                <input
                    className={styles.input}
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

            <div className={styles.inputGroup}>
                <input
                    className={`${styles.input} ${styles.inputPassword}`}
                    placeholder="Senha"
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                />
                <i
                    className={`fa-solid ${mostrarSenha ? 'fa-eye-slash' : 'fa-eye'} ${styles.iconSenha}`}
                    onClick={alternarVisibilidade}
                ></i>
            </div>

            {erro && <p style={{color: 'red', fontSize: '0.8rem', textAlign:'center'}}>{erro}</p>}

            <button className={styles.button} onClick={entrar}>Entrar</button>

            <div style={{marginTop: 20, fontSize: '0.8rem', color: '#666', textAlign: 'center'}}>
                <p>Acesso Portfólio:</p>
                <p><b>teste@portfolio.com</b> / <b>123456</b></p>
            </div>
        </div>
    )
}

export default CardLogin;