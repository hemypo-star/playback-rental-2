import React from 'react';
import { IScrollInfoContext } from '../ScrollInfoProvider/context.js';
export type ChildFunction = (context: IScrollInfoContext) => React.ReactNode;
export type ScrollInfoProps = {
    children?: React.ReactNode | ChildFunction;
};
export declare const ScrollInfo: React.FC<ScrollInfoProps>;
