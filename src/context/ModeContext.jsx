import React, { createContext, useContext, useState } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('campusrun_mode') || 'buyer');

  const toggleMode = (newMode) => {
    setMode(newMode);
    localStorage.setItem('campusrun_mode', newMode);
  };

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}