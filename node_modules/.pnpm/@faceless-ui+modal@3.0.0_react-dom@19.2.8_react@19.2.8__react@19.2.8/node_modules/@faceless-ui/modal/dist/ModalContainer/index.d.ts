import React, { ElementType, HTMLProps } from 'react';
export declare const containerBaseClass = "modal-container";
export type ModalContainerProps = HTMLProps<HTMLElement> & {
    htmlElement?: ElementType;
    children?: React.ReactNode;
};
export declare const ModalContainer: React.FC<ModalContainerProps>;
