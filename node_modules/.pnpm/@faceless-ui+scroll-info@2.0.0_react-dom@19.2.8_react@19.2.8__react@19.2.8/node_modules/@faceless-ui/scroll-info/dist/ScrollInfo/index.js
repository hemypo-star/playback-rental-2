import React, { Fragment } from 'react';
import { useScrollInfo } from '../useScrollInfo/index.js';
export const ScrollInfo = (props) => {
    const { children } = props;
    const scrollInfo = useScrollInfo();
    if (children) {
        if (typeof children === 'function') {
            return (React.createElement(Fragment, null, children(scrollInfo)));
        }
        return (React.createElement(Fragment, null, children));
    }
    return null;
};
//# sourceMappingURL=index.js.map