"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Source } from "./api";

interface SourceContextType {
  source: Source;
  setSource: (source: Source) => void;
}

const SourceContext = createContext<SourceContextType | undefined>(undefined);

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<Source>("coomer");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("app-source") as Source;
    if (saved && (saved === "coomer" || saved === "kemono")) {
      setSource(saved);
    }
  }, []);

  const handleSetSource = (newSource: Source) => {
    setSource(newSource);
    localStorage.setItem("app-source", newSource);
  };

  return (
    <SourceContext.Provider value={{ source, setSource: handleSetSource }}>
      {children}
    </SourceContext.Provider>
  );
}

export function useSource() {
  const context = useContext(SourceContext);
  if (context === undefined) {
    throw new Error("useSource must be used within a SourceProvider");
  }
  return context;
}
