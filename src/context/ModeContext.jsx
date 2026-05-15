import React, { createContext, useContext, useState } from 'react';

const ModeContext = createContext();

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('campusrun_mode') || 'buyer');

  const toggleMode = () => {
    const next = mode === 'buyer' ? 'courier' : 'buyer';
    setMode(next);
    localStorage.setItem('campusrun_mode', next);
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