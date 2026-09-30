export const reducer = (state, action) => {
    let newState = Object.assign({}, state);
    const { type, payload, } = action;
    switch (type) {
        case 'UPDATE_MODAL': {
            const { slug, } = payload;
            if (slug) {
                newState[slug] = Object.assign(Object.assign({}, newState[slug]), payload);
            }
            break;
        }
        case 'OPEN_MODAL': {
            const { slug, } = payload;
            if (slug) {
                const isCurrentlyOpen = slug in newState && newState[slug].isOpen;
                if (!isCurrentlyOpen) {
                    newState[slug] = Object.assign(Object.assign({}, newState[slug]), { slug, openedOn: Date.now(), isOpen: true });
                }
            }
            break;
        }
        case 'TOGGLE_MODAL': {
            const { slug, } = payload;
            if (slug) {
                const isCurrentlyOpen = slug in newState && newState[slug].isOpen;
                newState[slug] = Object.assign(Object.assign({}, newState[slug]), { slug, openedOn: !isCurrentlyOpen ? Date.now() : undefined, isOpen: !isCurrentlyOpen });
            }
            break;
        }
        case 'CLOSE_MODAL': {
            const { slug, } = payload;
            if (slug) {
                newState[slug] = Object.assign(Object.assign({}, newState[slug]), { slug, openedOn: undefined, isOpen: false });
            }
            break;
        }
        case 'REMOVE_MODAL': {
            const { slug, } = payload;
            if (slug && slug in newState) {
                delete newState[slug];
            }
            break;
        }
        case 'CLOSE_LATEST_MODAL': {
            const latestModal = Object.keys(newState)
                .reduce((acc, slug) => {
                const modal = newState[slug];
                if (modal.isOpen && typeof modal.openedOn === 'number' && (!acc || (typeof acc.openedOn === 'number' && modal.openedOn > acc.openedOn))) {
                    return modal;
                }
                return acc;
            }, undefined);
            if (latestModal) {
                newState[latestModal.slug] = Object.assign(Object.assign({}, newState[latestModal.slug]), { isOpen: false, openedOn: undefined });
            }
            break;
        }
        case 'CLOSE_ALL_MODALS': {
            newState = Object.entries((newState)).reduce((acc, [key, value]) => {
                acc[key] = Object.assign(Object.assign({}, value), { isOpen: false, openedOn: undefined });
                return acc;
            }, {});
            break;
        }
        default: {
            break;
        }
    }
    return newState;
};
//# sourceMappingURL=reducer.js.map