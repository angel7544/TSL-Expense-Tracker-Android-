export const Palettes = {
       emerald: {
        primary: '#10B981',
        light: '#34D399',
        lighter: '#A7F3D0',
        dark: '#047857'
    },
    sky: {
        primary: '#0EA5E9',
        light: '#38BDF8',
        lighter: '#BAE6FD',
        dark: '#0369A1'
    },
    amber: {
        primary: '#F59E0B',
        light: '#FBBF24',
        lighter: '#FDE68A',
        dark: '#B45309'
    },
    red: {
        primary: '#EF4444',
        light: '#F87171',
        lighter: '#FECACA',
        dark: '#991B1B'
    },
   
   
    zinc: {
        primary: '#71717A',
        light: '#A1A1AA',
        lighter: '#D4D4D8',
        dark: '#444444'
    },

    pink: {
        primary: '#EC4899',
        light: '#F9A8D4',
        lighter: '#FCE7F3',
        dark: '#9D174D'
    },
    indigo: {
        primary: '#6366F1',
        light: '#818CF8',
        lighter: '#C7D2FE',
        dark: '#4338CA'
    }
};

export const BaseColors = {
    light: {
        background: '#F3F4F6',
        card: '#FFFFFF',
        text: '#1F2937',
        subtext: '#6B7280',
        border: '#E5E7EB',
        input: '#F9FAFB',
        placeholder: '#9CA3AF',
        danger: '#EF4444',
        success: '#10B981'
    },
    dark: {
        background: '#111827',
        card: '#1F2937',
        text: '#F9FAFB',
        subtext: '#9CA3AF',
        border: '#374151',
        input: '#374151',
        placeholder: '#6B7280',
        danger: '#F87171',
        success: '#34D399'
    }
};

export const getTheme = (name: keyof typeof Palettes = 'emerald', mode: 'light' | 'dark' = 'light') => {
    const palette = Palettes[name] || Palettes['emerald'];
    return {
        colors: {
            ...BaseColors[mode],
            ...palette
        },
        mode,
        name
    };
};
