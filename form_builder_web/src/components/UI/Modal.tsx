import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    type?: 'center' | 'bottom-sheet';
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    footer,
    type = 'center'
}) => {
    const [render, setRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            // Defer state update to avoid synchronous setState in effect
            setTimeout(() => setRender(true), 0);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => {
                setRender(false);
                document.body.style.overflow = 'unset';
            }, 300); // Match CSS transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!render) return null;

    return (
        <div className={`vs-modal-overlay ${isOpen ? 'open' : 'closing'}`} onClick={onClose}>
            <div
                className={`vs-modal-content ${type} ${isOpen ? 'open' : 'closing'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="vs-modal-header">
                    <h3>{title}</h3>
                    <button className="vs-modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="vs-modal-body">
                    {children}
                </div>

                {footer && (
                    <div className="vs-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
