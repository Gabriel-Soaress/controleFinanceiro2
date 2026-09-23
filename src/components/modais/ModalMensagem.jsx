import React, { useEffect } from 'react';
import styles from '../../modules/ModalMensagem.module.css';

/**
 * Modal universal para substituir window.alert() e window.confirm()
 * 
 * Props:
 * - aberta: boolean
 * - tipo: 'aviso' | 'erro' | 'sucesso' | 'confirmacao'
 * - titulo: string
 * - mensagem: string
 * - textoConfirmar: string (default: 'OK' ou 'Confirmar')
 * - textoCancelar: string (default: 'Cancelar')
 * - perigoso: boolean (se true, botão de confirmação fica vermelho)
 * - aoConfirmar: () => void
 * - aoCancelar: () => void
 */
function ModalMensagem({
    aberta,
    tipo = 'aviso',
    titulo,
    mensagem,
    textoConfirmar,
    textoCancelar = 'Cancelar',
    perigoso = false,
    aoConfirmar,
    aoCancelar
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!aberta) return;
            if (e.key === 'Escape') {
                if (aoCancelar) aoCancelar();
                else if (aoConfirmar) aoConfirmar();
            } else if (e.key === 'Enter') {
                if (aoConfirmar) aoConfirmar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [aberta, aoConfirmar, aoCancelar]);

    if (!aberta) return null;

    const renderIcone = () => {
        switch (tipo) {
            case 'sucesso':
                return (
                    <div className={`${styles.iconeContainer} ${styles.iconeSucesso}`}>
                        <i className="fa-solid fa-circle-check"></i>
                    </div>
                );
            case 'erro':
                return (
                    <div className={`${styles.iconeContainer} ${styles.iconeErro}`}>
                        <i className="fa-solid fa-circle-xmark"></i>
                    </div>
                );
            case 'confirmacao':
                return (
                    <div className={`${styles.iconeContainer} ${perigoso ? styles.iconePerigo : styles.iconeInfo}`}>
                        <i className={perigoso ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-question"}></i>
                    </div>
                );
            case 'aviso':
            default:
                return (
                    <div className={`${styles.iconeContainer} ${styles.iconeAviso}`}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                    </div>
                );
        }
    };

    const tituloPadrao = () => {
        if (titulo) return titulo;
        switch (tipo) {
            case 'sucesso': return 'Tudo Certo!';
            case 'erro': return 'Atenção';
            case 'confirmacao': return 'Confirmar Ação';
            default: return 'Aviso';
        }
    };

    const labelConfirmar = textoConfirmar || (tipo === 'confirmacao' ? 'Confirmar' : 'Entendido');

    return (
        <div className={styles.overlay} onClick={aoCancelar || aoConfirmar}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {renderIcone()}

                <h3 className={styles.titulo}>{tituloPadrao()}</h3>
                <p className={styles.mensagem}>{mensagem}</p>

                <div className={styles.rodape}>
                    {tipo === 'confirmacao' && (
                        <button
                            type="button"
                            className={styles.btnCancelar}
                            onClick={aoCancelar}
                        >
                            {textoCancelar}
                        </button>
                    )}
                    <button
                        type="button"
                        className={`${styles.btnConfirmar} ${perigoso ? styles.btnPerigo : ''}`}
                        onClick={aoConfirmar}
                        autoFocus
                    >
                        {labelConfirmar}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ModalMensagem;
