import React from 'react';
import { IWindowInfoContext } from '../WindowInfoProvider/context.js';
export type ChildFunction = (context: IWindowInfoContext) => React.ReactNode;
export type WindowInfoProps = {
    children?: React.ReactNode | ChildFunction;
};
export declare const WindowInfo: React.FC<WindowInfoProps>;
