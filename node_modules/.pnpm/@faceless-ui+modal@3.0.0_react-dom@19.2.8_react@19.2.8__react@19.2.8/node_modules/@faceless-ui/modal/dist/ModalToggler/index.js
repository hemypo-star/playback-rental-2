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
import { useModal } from '../useModal/index.js';
export const togglerBaseClass = 'modal-toggler';
export const ModalToggler = (props) => {
    const { slug, htmlElement: Tag = 'button', children, onClick, className } = props, rest = __rest(props, ["slug", "htmlElement", "children", "onClick", "className"]);
    const { modalState, toggleModal, classPrefix, } = useModal();
    const baseClass = classPrefix ? `${classPrefix}__${togglerBaseClass}` : togglerBaseClass;
    const isOpen = modalState[slug] && modalState[slug].isOpen;
    return (_jsx(Tag, Object.assign({ className: [
            baseClass,
            `${baseClass}--slug-${slug}`,
            isOpen && `${baseClass}--slug-${slug}--is-open`,
            className,
        ].filter(Boolean).join(' '),
        role: 'button',
        'aria-expanded': isOpen ? 'true' : 'false',
        'aria-controls': slug,
        'aria-label': `${!isOpen ? 'Open' : 'Close'} modal ${slug}` }, rest, { onClick: (e) => {
            toggleModal(slug);
            if (typeof onClick === 'function')
                onClick(e);
        }, children: children && children })));
};
//# sourceMappingURL=index.js.map