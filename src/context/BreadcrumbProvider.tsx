import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface BreadcrumbOverride {
    segment: string;
    label: string;
}

interface BreadcrumbContextType {
    overrides: BreadcrumbOverride[];
    setOverrides: (overrides: BreadcrumbOverride[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
    overrides: [],
    setOverrides: () => {},
});

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
    const [overrides, setOverrides] = useState<BreadcrumbOverride[]>([]);
    const value = useMemo(() => ({ overrides, setOverrides }), [overrides]);
    return (
        <BreadcrumbContext.Provider value={value}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export const useBreadcrumbs = () => useContext(BreadcrumbContext);
