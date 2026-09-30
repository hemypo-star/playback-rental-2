import React from 'react';
import { useScrollInfo } from '../useScrollInfo/index.js';
export const withScrollInfo = (PassedComponent) => {
    const ScrollInfoWrap = (props) => {
        const scrollInfoContext = useScrollInfo();
        return (React.createElement(PassedComponent, Object.assign({}, props, { scrollInfo: scrollInfoContext })));
    };
    return ScrollInfoWrap;
};
//# sourceMappingURL=index.js.map