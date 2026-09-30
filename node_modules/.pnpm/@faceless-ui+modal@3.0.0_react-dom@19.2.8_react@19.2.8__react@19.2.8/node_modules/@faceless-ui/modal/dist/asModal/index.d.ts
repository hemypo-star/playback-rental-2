import React from 'react';
import { ModalProps } from '../Modal/index.js';
export declare const itemBaseClass = "modal-item";
export declare const asModal: <P extends ModalProps>(ModalComponent: React.FC<P>, slugFromArg?: string) => React.FC<P>;
