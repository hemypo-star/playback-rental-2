'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useState, useRef, useEffect, useCallback, useReducer, } from 'react';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';
import { generateCSS } from './generateCSS.js';
import { ModalContext } from './context.js';
import { reducer } from './reducer.js';
const getSearchQuery = () => {
    if (typeof window !== 'undefined') {
        return new URLSearchParams(window.location.search);
    }
};
const getModalParamArray = () => {
    const searchQuery = getSearchQuery();
    let params = [];
    if (searchQuery) {
        const modalParam = searchQuery.get('modal');
        if (modalParam) {
            // Check if the parameter contains a comma, indicating multiple values
            if (modalParam.includes(',')) {
                params = modalParam.split(',');
            }
            else {
                params = [modalParam];
            }
        }
    }
    return params;
};
export const ModalProvider = (props) => {
    const { classPrefix, minifyCSS = true, generateCSS: shouldGenerateCSS = true, zIndex = 9999, handleParamChange, children, transTime = 250, } = props;
    const containerRef = useRef(null);
    const [modalState, dispatchModalState] = useReducer(reducer, {}, () => {
        const initialParams = getModalParamArray();
        const initialState = initialParams.reduce((acc, param) => {
            acc[param] = {
                slug: param,
                isOpen: true,
                openedOn: Date.now(),
            };
            return acc;
        }, {});
        return initialState;
    });
    const [oneIsOpen, setOneIsOpen] = useState(false);
    const [closeOnBlur, setCloseOnBlur] = useState(false);
    const [bodyScrollIsLocked, setBodyScrollIsLocked] = useState(false);
    const [cssString, setCSSString] = useState('');
    const escIsBound = useRef(false);
    const bindEsc = useCallback((e) => {
        if (e.keyCode === 27) {
            dispatchModalState({
                type: 'CLOSE_LATEST_MODAL',
            });
        }
    }, []);
    // Bind esc key to close all modals
    useEffect(() => {
        if (!escIsBound.current) {
            document.addEventListener('keydown', (e) => bindEsc(e), false);
            escIsBound.current = true;
        }
        return () => {
            if (escIsBound.current) {
                document.removeEventListener('keydown', (e) => bindEsc(e), false);
            }
        };
    }, [bindEsc]);
    // Generate CSS to inject into stylesheet
    useEffect(() => {
        if (shouldGenerateCSS) {
            let newString = '';
            newString = generateCSS({
                classPrefix,
                zIndex
            });
            if (minifyCSS)
                newString = newString.replace(/\n/g, '').replace(/\s\s+/g, ' ');
            setCSSString(newString);
        }
    }, [
        shouldGenerateCSS,
        minifyCSS,
        zIndex,
        classPrefix
    ]);
    // Handle param changes
    useEffect(() => {
        if (typeof handleParamChange === 'function') {
            handleParamChange(modalState);
        }
        if (typeof handleParamChange === 'boolean' && handleParamChange) {
            const openModals = Object.keys(modalState).filter((slug) => modalState[slug].isOpen);
            const params = new URLSearchParams();
            for (const modal of openModals) {
                params.append('modal', modal);
            }
            const queryWithModal = params.toString() ? `?${params}` : '';
            const newURL = `${window.location.pathname}${queryWithModal}`;
            window.history.pushState({}, '', newURL);
        }
    }, [
        modalState,
        handleParamChange,
    ]);
    // Determine if any modals are open
    useEffect(() => {
        const isOneOpen = Object.keys(modalState).some((key) => modalState[key].isOpen);
        setOneIsOpen(isOneOpen);
    }, [modalState]);
    const setBodyScrollLock = useCallback((shouldLock, excludingRef) => {
        if (excludingRef) {
            if (shouldLock) {
                disableBodyScroll(excludingRef);
                setBodyScrollIsLocked(true);
            }
            else {
                enableBodyScroll(excludingRef);
                setBodyScrollIsLocked(false);
            }
        }
    }, []);
    const setContainerRef = useCallback((ref) => {
        containerRef.current = ref;
    }, []);
    const openModal = useCallback((slug) => {
        dispatchModalState({
            type: 'OPEN_MODAL',
            payload: {
                slug,
            }
        });
    }, []);
    const closeModal = useCallback((slug) => {
        dispatchModalState({
            type: 'CLOSE_MODAL',
            payload: {
                slug,
            }
        });
    }, []);
    const closeAllModals = useCallback(() => {
        dispatchModalState({
            type: 'CLOSE_ALL_MODALS'
        });
    }, []);
    const toggleModal = useCallback((slug) => {
        dispatchModalState({
            type: 'TOGGLE_MODAL',
            payload: {
                slug,
            }
        });
    }, []);
    const isModalOpen = useCallback((slug) => {
        return modalState[slug] && modalState[slug].isOpen;
    }, [modalState]);
    const inheritedProps = Object.assign({}, props);
    delete inheritedProps.children;
    return (_jsxs(Fragment, { children: [shouldGenerateCSS && _jsx("style", { dangerouslySetInnerHTML: { __html: cssString } }), _jsx(ModalContext.Provider, { value: Object.assign(Object.assign({}, inheritedProps), { transTime,
                    // state
                    containerRef,
                    modalState, oneModalIsOpen: oneIsOpen, isModalOpen,
                    closeOnBlur,
                    bodyScrollIsLocked,
                    classPrefix,
                    // methods
                    closeAllModals,
                    setCloseOnBlur,
                    openModal,
                    closeModal,
                    toggleModal,
                    setBodyScrollLock,
                    setContainerRef }), children: children })] }));
};
//# sourceMappingURL=index.js.map