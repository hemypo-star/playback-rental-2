import React from 'react';
import { ModalState } from './context.js';
export type ModalProviderProps = {
    generateCSS?: boolean;
    minifyCSS?: boolean;
    classPrefix?: string;
    handleParamChange?: (modalState: ModalState) => void | boolean;
    transTime?: number;
    zIndex?: number | string;
    children?: React.ReactNode;
};
export declare const ModalProvider: React.FC<ModalProviderProps>;
