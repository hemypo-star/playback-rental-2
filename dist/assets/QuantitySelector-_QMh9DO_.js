import{Q as d,j as e,I as o}from"./index-CKzDOQbx.js";/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const x=d("Minus",[["path",{d:"M5 12h14",key:"1ays0h"}]]);/**
 * @license lucide-react v0.462.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=d("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]),f=({quantity:s,onQuantityChange:l,maxQuantity:a,minQuantity:r=1,disabled:t=!1,size:c="md"})=>{const h=()=>{s>r&&l(s-1)},i=()=>{s<a&&l(s+1)},n={sm:"h-8 w-8 text-sm",md:"h-10 w-10",lg:"h-12 w-12 text-lg"},m={sm:"h-8 w-12 text-sm",md:"h-10 w-16",lg:"h-12 w-20 text-lg"};return e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(o,{variant:"outline",size:"icon",className:n[c],onClick:h,disabled:t||s<=r,children:e.jsx(x,{className:"h-4 w-4"})}),e.jsx("div",{className:`${m[c]} flex items-center justify-center border border-gray-300 rounded bg-white font-medium`,children:s}),e.jsx(o,{variant:"outline",size:"icon",className:n[c],onClick:i,disabled:t||s>=a,children:e.jsx(j,{className:"h-4 w-4"})})]})};export{j as P,f as Q};
