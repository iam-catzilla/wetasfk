"use client"

import React, { createContext, useContext, useState } from "react"
import { Source } from "./api"

interface SourceContextType {
  source: Source
  setSource: (source: Source) => void
}

const SourceContext = createContext<SourceContextType | undefined>(undefined)

function getInitialSource(): Source {
  if (typeof window === "undefined") return "coomer"

  const saved = localStorage.getItem("app-source") as Source
  return saved === "coomer" || saved === "kemono" ? saved : "coomer"
}

export function SourceProvider({ children }: { children: React.ReactNode }) {
  const [source, setSource] = useState<Source>(getInitialSource)

  const handleSetSource = (newSource: Source) => {
    setSource(newSource)
    localStorage.setItem("app-source", newSource)
  }

  return (
    <SourceContext.Provider value={{ source, setSource: handleSetSource }}>
      {children}
    </SourceContext.Provider>
  )
}

export function useSource() {
  const context = useContext(SourceContext)
  if (context === undefined) {
    throw new Error("useSource must be used within a SourceProvider")
  }
  return context
}
