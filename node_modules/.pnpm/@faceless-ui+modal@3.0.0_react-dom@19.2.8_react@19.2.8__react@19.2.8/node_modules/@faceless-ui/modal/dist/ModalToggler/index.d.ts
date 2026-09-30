import React, { ElementType, HTMLProps } from 'react';
import { IModalContext } from '../ModalProvider/context.js';
export declare const togglerBaseClass = "modal-toggler";
export type ModalTogglerProps = HTMLProps<HTMLElement> & {
    slug: string;
    modal?: IModalContext;
    htmlElement?: ElementType;
    children?: React.ReactNode;
};
export declare const ModalToggler: React.FC<ModalTogglerProps>;
