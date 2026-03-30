import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface Breadcrumb {
    label: string;
    path: string;
}

interface BreadcrumbContextType {
    crumbs: Breadcrumb[];
    setCrumbs: (crumbs: Breadcrumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
    crumbs: [],
    setCrumbs: () => {},
});

export const BreadcrumbProvider = ({ children }: { children: ReactNode }) => {
    const [crumbs, setCrumbs] = useState<Breadcrumb[]>([]);

    // Update document title when crumbs change
    useEffect(() => {
        const last = crumbs[crumbs.length - 1];
        document.title = last ? `${last.label} — Are-Self` : 'Are-Self';
    }, [crumbs]);

    const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
    return (
        <BreadcrumbContext.Provider value={value}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export const useBreadcrumbs = () => useContext(BreadcrumbContext);
