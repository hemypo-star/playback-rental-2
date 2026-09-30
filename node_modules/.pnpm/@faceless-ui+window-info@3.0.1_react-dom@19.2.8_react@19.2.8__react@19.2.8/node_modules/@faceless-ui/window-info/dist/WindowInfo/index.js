'use client';
import React, { Fragment } from 'react';
import { useWindowInfo } from '../useWindowInfo/index.js';
export const WindowInfo = (props) => {
    const { children } = props;
    const windowInfo = useWindowInfo();
    if (children) {
        if (typeof children === 'function') {
            return (React.createElement(Fragment, null, children(windowInfo)));
        }
        return (React.createElement(Fragment, null, children));
    }
    return null;
};
//# sourceMappingURL=index.js.map