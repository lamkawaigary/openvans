import { createContext, useContext, useState, useCallback } from 'react';

interface SideMenuContextValue {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
}

const SideMenuContext = createContext<SideMenuContextValue>({
  isOpen: false,
  openMenu: () => {},
  closeMenu: () => {},
});

export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  return (
    <SideMenuContext.Provider value={{ isOpen, openMenu, closeMenu }}>
      {children}
    </SideMenuContext.Provider>
  );
}

export function useSideMenu() {
  return useContext(SideMenuContext);
}
