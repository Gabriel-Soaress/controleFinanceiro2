import React from 'react';
import styles from "../modules/Header.module.css";

function Header({ aoSair, tema = 'escuro', aoAlternarTema }) {
    const ehModoClaro = tema === 'claro';

    return (
        <header className={styles.Header}>
            {/* IDENTIDADE DO SISTEMA */}
            <div className={styles.logoArea}>
                <div className={styles.iconeLogo}>
                    <i className="fa-solid fa-coins"></i>
                </div>
                <div className={styles.textoLogo}>
                    Finança <span className={styles.destaqueLogo}>DFashion</span>
                </div>
            </div>

            {/* AÇÕES À DIREITA */}
            <div className={styles.acoesArea}>
                {/* BOTÃO ALTERNADOR DE MODO BRANCO / ESCURO */}
                <button
                    type="button"
                    className={styles.botaoTema}
                    onClick={aoAlternarTema}
                    title={ehModoClaro ? "Alternar para Modo Escuro" : "Alternar para Modo Branco (Claro)"}
                >
                    {ehModoClaro ? (
                        <>
                            <i className={`fa-solid fa-moon ${styles.iconeLua}`}></i>
                            Modo Escuro
                        </>
                    ) : (
                        <>
                            <i className={`fa-solid fa-sun ${styles.iconeSol}`}></i>
                            Modo Branco
                        </>
                    )}
                </button>

                {/* BOTÃO SAIR */}
                <button className={styles.botaoSair} onClick={aoSair} title="Encerrar sessão">
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    Sair
                </button>
            </div>
        </header>
    );
}

export default Header;