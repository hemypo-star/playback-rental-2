import type { Options } from 'focus-trap';
import React, { ElementType, HTMLProps } from 'react';
import { IModalContext } from '../ModalProvider/context.js';
export type ModalPropsWithContext = ModalProps & {
    modal?: IModalContext;
};
export type ChildFunction = (propsWithContext: ModalPropsWithContext) => React.ReactNode;
export interface ModalProps extends Omit<HTMLProps<HTMLElement>, 'children'> {
    slug: string;
    closeOnBlur?: boolean;
    lockBodyScroll?: boolean;
    htmlElement?: ElementType;
    classPrefix?: string;
    onOpen?: () => void;
    onClose?: () => void;
    onEnter?: () => void;
    onEntered?: () => void;
    onEntering?: () => void;
    onExit?: () => void;
    onExiting?: () => void;
    onExited?: () => void;
    openOnInit?: boolean;
    children?: React.ReactNode | ChildFunction;
    trapFocus?: boolean;
    focusTrapOptions?: Options;
}
export declare const Modal: React.FC<ModalProps & {
    modal?: IModalContext;
} & {
    children?: React.ReactNode | ChildFunction;
}>;
