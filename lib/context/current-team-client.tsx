'use client';

import { createContext, useContext } from 'react';
import type { TeamRole } from './current-team';

export interface CurrentTeamContextValue {
  teamId: string;
  slug: string;
  name: string;
  role: TeamRole;
  isSuperAdmin: boolean;
}

const CurrentTeamContext = createContext<CurrentTeamContextValue | null>(null);

export function CurrentTeamProvider({
  value,
  children,
}: {
  value: CurrentTeamContextValue;
  children: React.ReactNode;
}) {
  return (
    <CurrentTeamContext.Provider value={value}>
      {children}
    </CurrentTeamContext.Provider>
  );
}

export function useCurrentTeam(): CurrentTeamContextValue {
  const ctx = useContext(CurrentTeamContext);
  if (!ctx) {
    throw new Error('useCurrentTeam must be used inside <CurrentTeamProvider>');
  }
  return ctx;
}

export function useCurrentTeamOptional(): CurrentTeamContextValue | null {
  return useContext(CurrentTeamContext);
}
