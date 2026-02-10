import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME } from '../config/themes';

const ThemeContext = createContext();

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME);

    // Apply theme to document root — always dark
    useEffect(() => {
        const theme = THEMES[currentTheme];
        if (!theme) return;

        const root = document.documentElement;

        // Always apply dark class
        root.classList.add('dark');
        document.body.classList.add('dark');

        // Apply theme colors as CSS variables
        Object.entries(theme.colors).forEach(([key, value]) => {
            const cssVarName = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVarName, value);
        });

        // Save to localStorage
        localStorage.setItem('app_theme', currentTheme);
    }, [currentTheme]);

    const setTheme = (themeId) => {
        if (THEMES[themeId]) {
            setCurrentTheme(themeId);
        }
    };

    const value = {
        currentTheme,
        theme: THEMES[currentTheme],
        setTheme,
        themes: THEMES
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};
