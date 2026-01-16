import React from 'react';
import { getTheme } from '../constants/Theme';

export const UIContext = React.createContext({
    showAddModal: () => {},
    showOnboarding: () => {},
    theme: getTheme()
});
