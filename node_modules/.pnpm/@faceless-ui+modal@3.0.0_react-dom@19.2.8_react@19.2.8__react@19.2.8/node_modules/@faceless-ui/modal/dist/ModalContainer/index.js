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
import { CSSTransition } from 'react-transition-group';
import { useModal } from '../useModal/index.js';
import { generateTransitionClasses } from '../ModalProvider/generateTransitionClasses.js';
export const containerBaseClass = 'modal-container';
export const ModalContainer = (props) => {
    const { oneModalIsOpen, classPrefix, transTime, setContainerRef, containerRef, closeAllModals, closeOnBlur, } = useModal();
    const { className, htmlElement: Tag = 'div', children, onClick } = props, rest = __rest(props, ["className", "htmlElement", "children", "onClick"]);
    const baseClass = classPrefix ? `${classPrefix}__${containerBaseClass}` : containerBaseClass;
    const mergedClasses = [
        baseClass,
        className,
    ].filter(Boolean).join(' ');
    const mergedAttributes = Object.assign(Object.assign({}, rest), { onClick: (e) => {
            if (closeOnBlur)
                closeAllModals();
            if (typeof onClick === 'function')
                onClick(e);
        } });
    return (_jsx(CSSTransition, { nodeRef: containerRef, in: oneModalIsOpen, timeout: transTime, classNames: generateTransitionClasses(baseClass), appear: true, children: _jsx(Tag, Object.assign({ className: mergedClasses,
            ref: setContainerRef }, mergedAttributes, { children: children && children })) }));
};
//# sourceMappingURL=index.js.map