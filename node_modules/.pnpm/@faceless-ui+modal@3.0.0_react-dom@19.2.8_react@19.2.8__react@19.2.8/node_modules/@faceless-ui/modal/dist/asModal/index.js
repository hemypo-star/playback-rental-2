'use client';
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useState, } from 'react';
import ReactDOM from 'react-dom';
import { CSSTransition } from 'react-transition-group';
import { useModal } from '../useModal/index.js';
import { generateTransitionClasses } from '../ModalProvider/generateTransitionClasses.js';
import { createFocusTrap } from 'focus-trap';
export const itemBaseClass = 'modal-item';
export const asModal = (ModalComponent, slugFromArg) => {
    const ModalWrap = (props) => {
        const modal = useModal();
        const modalRef = useRef(null);
        const [layTrap, setLayTrap] = useState(false);
        const trapHasBeenLayed = useRef(false);
        const [trap, setTrap] = useState(null);
        const { modalState, classPrefix: classPrefixFromContext, containerRef, transTime, setCloseOnBlur, setBodyScrollLock, openModal } = modal;
        const { className, htmlElement: Tag = 'dialog', slug: slugFromProp = '', closeOnBlur = true, lockBodyScroll = true, 
        // autoFocus: true,
        // trapFocus: true,
        // returnFocus: true,
        classPrefix: classPrefixFromProps, onEnter, onEntering, onEntered, onExit, onExiting, onExited, openOnInit, trapFocus = true, focusTrapOptions = {} } = props, rest = __rest(props, ["className", "htmlElement", "slug", "closeOnBlur", "lockBodyScroll", "classPrefix", "onEnter", "onEntering", "onEntered", "onExit", "onExiting", "onExited", "openOnInit", "trapFocus", "focusTrapOptions"]);
        const classPrefixToUse = classPrefixFromProps || classPrefixFromContext;
        const slug = slugFromArg || slugFromProp;
        const isOpen = modalState[slug] && modalState[slug].isOpen;
        useEffect(() => {
            if (trapFocus) {
                const currentModal = modalRef.current;
                if (trapHasBeenLayed.current === false && currentModal) {
                    const newTrap = createFocusTrap(currentModal, Object.assign(Object.assign({}, focusTrapOptions), { fallbackFocus: (focusTrapOptions === null || focusTrapOptions === void 0 ? void 0 : focusTrapOptions.fallbackFocus) || currentModal, allowOutsideClick: typeof focusTrapOptions.allowOutsideClick !== 'undefined' ? focusTrapOptions.allowOutsideClick : true }));
                    setTrap(newTrap);
                    trapHasBeenLayed.current = true;
                }
            }
        }, [
            trapFocus,
            layTrap,
            focusTrapOptions
        ]);
        useEffect(() => {
            setLayTrap(true);
        }, []);
        useEffect(() => {
            if (trap) {
                if (isOpen)
                    trap.activate();
                else
                    trap.deactivate();
            }
            return () => {
                if (trap)
                    trap.deactivate();
            };
        }, [
            isOpen,
            trap
        ]);
        useEffect(() => {
            if (isOpen)
                setCloseOnBlur(closeOnBlur);
        }, [
            isOpen,
            closeOnBlur,
            setCloseOnBlur,
        ]);
        useEffect(() => {
            const currentModal = modalRef.current;
            if (currentModal) {
                if (isOpen && lockBodyScroll) {
                    setBodyScrollLock(true, currentModal);
                }
                else {
                    setBodyScrollLock(false, currentModal);
                }
            }
            return () => {
                if (currentModal) {
                    setBodyScrollLock(false, currentModal);
                }
            };
        }, [
            isOpen,
            lockBodyScroll,
            setBodyScrollLock,
        ]);
        const [timedOpen, setTimedOpen] = useState(isOpen);
        useEffect(() => {
            if (!isOpen)
                setTimeout(() => setTimedOpen(false), transTime);
            else
                setTimedOpen(isOpen);
        }, [
            isOpen,
            transTime,
        ]);
        useEffect(() => {
            if (openOnInit) {
                openModal(slug);
            }
        }, [
            slug,
            openOnInit,
            openModal
        ]);
        if (containerRef.current) {
            const baseClass = classPrefixToUse ? `${classPrefixToUse}__${itemBaseClass}` : itemBaseClass;
            const mergedClasses = [
                baseClass,
                `${baseClass}--slug-${slug}`,
                className,
            ].filter(Boolean).join(' ');
            const mergedAttributes = Object.assign({ role: Tag !== 'dialog' ? 'dialog' : undefined, open: Tag === 'dialog' ? timedOpen || isOpen : undefined, 'aria-modal': true, 'aria-label': !rest['aria-labelledby'] ? slug : undefined }, rest);
            return ReactDOM.createPortal(_jsx(CSSTransition, { nodeRef: modalRef,
                timeout: transTime,
                in: isOpen,
                classNames: generateTransitionClasses(baseClass),
                appear: true,
                onEnter,
                onEntering,
                onEntered,
                onExit,
                onExiting,
                onExited, children: _jsx(Tag, Object.assign({ ref: modalRef,
                    id: (rest === null || rest === void 0 ? void 0 : rest.id) || slug,
                    className: mergedClasses }, mergedAttributes, { children: _jsx(ModalComponent, Object.assign({}, props, { isOpen,
                        modal })) })) }), containerRef.current);
        }
        return null;
    };
    return ModalWrap;
};
//# sourceMappingURL=index.js.map