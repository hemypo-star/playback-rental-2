'use client';
import React from 'react';
import { useWindowInfo } from '../useWindowInfo/index.js';
export const withWindowInfo = (PassedComponent) => {
    const WindowInfoWrap = (props) => {
        const windowInfoContext = useWindowInfo();
        return (React.createElement(PassedComponent, Object.assign({}, props, { windowInfo: windowInfoContext })));
    };
    return WindowInfoWrap;
};
//# sourceMappingURL=index.js.map