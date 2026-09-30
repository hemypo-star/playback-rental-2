import { ModalStatus, ModalState } from './context.js';
export type UPDATE_MODAL = {
    type: 'UPDATE_MODAL';
    payload: ModalStatus;
};
export type OPEN_MODAL = {
    type: 'OPEN_MODAL';
    payload: {
        slug: string;
    };
};
export type CLOSE_MODAL = {
    type: 'CLOSE_MODAL';
    payload: {
        slug: string;
    };
};
export type TOGGLE_MODAL = {
    type: 'TOGGLE_MODAL';
    payload: {
        slug: string;
    };
};
export type REMOVE_MODAL = {
    type: 'REMOVE_MODAL';
    payload: {
        slug: string;
    };
};
export type CLOSE_LATEST_MODAL = {
    type: 'CLOSE_LATEST_MODAL';
    payload?: undefined;
};
export type CLOSE_ALL_MODALS = {
    type: 'CLOSE_ALL_MODALS';
    payload?: undefined;
};
export type Action = UPDATE_MODAL | OPEN_MODAL | REMOVE_MODAL | CLOSE_MODAL | TOGGLE_MODAL | CLOSE_LATEST_MODAL | CLOSE_ALL_MODALS;
export declare const reducer: (state: ModalState, action: Action) => ModalState;
