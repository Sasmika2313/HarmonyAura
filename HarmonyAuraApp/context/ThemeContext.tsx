import React, { createContext, useContext, useState } from "react";

type ThemeContextType = {
    dark: boolean;
    setDark: (v: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    dark: true,
    setDark: () => { }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [dark, setDark] = useState(true);
    return (
        <ThemeContext.Provider value={{ dark, setDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
