'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { Fragment } from 'react';
import { asModal } from '../asModal/index.js';
const _Modal = (props) => {
    const { children } = props;
    if (children) {
        if (typeof children === 'function') {
            return (_jsx(Fragment, { children: children(props) }));
        }
        return (_jsx(Fragment, { children: children }));
    }
    return null;
};
export const Modal = asModal(_Modal);
//# sourceMappingURL=index.js.map