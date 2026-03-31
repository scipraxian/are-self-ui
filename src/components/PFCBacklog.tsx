import { useState, useMemo } from 'react';
import { ArrowUpDown, ChevronsUp, ChevronUp, Minus, ChevronDown } from 'lucide-react';
import { PFCStatusBadge } from './PFCStatusBadge';
import { PFCInlineCreate } from './PFCInlineCreate';
import type { PFCAgileItem } from '../types';
import type { PFCItemStatus } from './PrefrontalCortex';
import './PFCBacklog.css';

interface PFCBacklogProps {
    items: PFCAgileItem[];
    statuses: PFCItemStatus[];
    selectedItemId?: string | null;
    filterEpicId?: string | null;
    filterStoryId?: string | null;
    onItemSelect: (item: PFCAgileItem) => void;
    onCreateItem: (name: string, type: 'EPIC' | 'STORY' | 'TASK', parentId?: string) => Promise<void>;
}

type SortField = 'name' | 'item_type' | 'status' | 'priority' | 'assignee' | 'parent';
type SortDir = 'asc' | 'desc';

interface FilterState {
    type: string;
    status: string;
    priority: string;
}

const PRIORITY_ICONS: Record<number, React.ReactNode> = {
    1: <ChevronsUp size={12} color="#ef4444" />,
    2: <ChevronUp size={12} color="#f99f1b" />,
    3: <Minus size={12} color="#94a3b8" />,
    4: <ChevronDown size={12} color="#64748b" />,
};

export function PFCBacklog({
    items, statuses, selectedItemId, filterEpicId, filterStoryId,
    onItemSelect, onCreateItem
}: PFCBacklogProps) {
    const [sortField, setSortField] = useState<SortField>('priority');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [filters, setFilters] = useState<FilterState>({ type: '', status: '', priority: '' });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    // Apply nav tree filters first
    const navFiltered = useMemo(() => {
        if (filterStoryId) {
            return items.filter(i =>
                i.id === filterStoryId ||
                (i.item_type === 'TASK' && i.parent_id === filterStoryId)
            );
        }
        if (filterEpicId) {
            const epicStoryIds = items
                .filter(i => i.item_type === 'STORY' && i.parent_id === filterEpicId)
                .map(s => s.id);
            return items.filter(i =>
                i.id === filterEpicId ||
                i.parent_id === filterEpicId ||
                (i.item_type === 'TASK' && epicStoryIds.includes(i.parent_id || ''))
            );
        }
        return items;
    }, [items, filterEpicId, filterStoryId]);

    // Apply local filters
    const filtered = useMemo(() => {
        let result = navFiltered;
        if (filters.type) result = result.filter(i => i.item_type === filters.type);
        if (filters.status) result = result.filter(i => i.status?.name === filters.status);
        if (filters.priority) result = result.filter(i => String(i.priority) === filters.priority);
        return result;
    }, [navFiltered, filters]);

    // Sort
    const sorted = useMemo(() => {
        const arr = [...filtered];
        const dir = sortDir === 'asc' ? 1 : -1;

        arr.sort((a, b) => {
            switch (sortField) {
                case 'name':
                    return dir * a.name.localeCompare(b.name);
                case 'item_type':
                    return dir * a.item_type.localeCompare(b.item_type);
                case 'status':
                    return dir * (a.status?.name || '').localeCompare(b.status?.name || '');
                case 'priority':
                    return dir * ((a.priority || 3) - (b.priority || 3));
                case 'assignee':
                    return dir * (a.owning_disc?.name || 'zzz').localeCompare(b.owning_disc?.name || 'zzz');
                case 'parent':
                    return dir * (a.parent_name || '').localeCompare(b.parent_name || '');
                default:
                    return 0;
            }
        });
        return arr;
    }, [filtered, sortField, sortDir]);

    const uniqueStatuses = [...new Set(items.map(i => i.status?.name).filter(Boolean))];
    const typeLabel = (t: string) => t === 'EPIC' ? 'E' : t === 'STORY' ? 'S' : 'T';

    const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
        <th className="pfc-backlog-th" onClick={() => handleSort(field)}>
            <span className="pfc-backlog-th-inner">
                {label}
                <ArrowUpDown size={10} className={sortField === field ? 'pfc-backlog-sort-active' : ''} />
            </span>
        </th>
    );

    return (
        <div className="pfc-backlog">
            <div className="pfc-backlog-toolbar">
                <div className="pfc-backlog-filters">
                    <select
                        className="pfc-backlog-filter-select"
                        value={filters.type}
                        onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                    >
                        <option value="">All Types</option>
                        <option value="EPIC">Epics</option>
                        <option value="STORY">Stories</option>
                        <option value="TASK">Tasks</option>
                    </select>
                    <select
                        className="pfc-backlog-filter-select"
                        value={filters.status}
                        onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                    >
                        <option value="">All Statuses</option>
                        {uniqueStatuses.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    <select
                        className="pfc-backlog-filter-select"
                        value={filters.priority}
                        onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                    >
                        <option value="">All Priorities</option>
                        <option value="1">P1: Critical</option>
                        <option value="2">P2: High</option>
                        <option value="3">P3: Normal</option>
                        <option value="4">P4: Low</option>
                    </select>
                    {(filters.type || filters.status || filters.priority) && (
                        <button
                            className="pfc-backlog-filter-clear"
                            onClick={() => setFilters({ type: '', status: '', priority: '' })}
                        >
                            Clear
                        </button>
                    )}
                </div>
                <div className="pfc-backlog-count">
                    {sorted.length} item{sorted.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div className="pfc-backlog-table-wrap">
                <table className="pfc-backlog-table">
                    <thead>
                        <tr>
                            <SortHeader field="item_type" label="Type" />
                            <SortHeader field="name" label="Title" />
                            <SortHeader field="status" label="Status" />
                            <SortHeader field="priority" label="Priority" />
                            <SortHeader field="assignee" label="Assignee" />
                            <SortHeader field="parent" label="Parent" />
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(item => {
                            const isSelected = selectedItemId === item.id;
                            const typeClass = item.item_type.toLowerCase();

                            return (
                                <tr
                                    key={item.id}
                                    className={`pfc-backlog-row pfc-backlog-row--${typeClass} ${isSelected ? 'pfc-backlog-row--selected' : ''}`}
                                    onClick={() => onItemSelect(item)}
                                >
                                    <td className="pfc-backlog-td pfc-backlog-td--type">
                                        <span className={`pfc-backlog-type-badge pfc-backlog-type-badge--${typeClass}`}>
                                            {typeLabel(item.item_type)}
                                        </span>
                                    </td>
                                    <td className="pfc-backlog-td pfc-backlog-td--name">
                                        <span className="pfc-backlog-item-name">{item.name}</span>
                                        <span className="pfc-backlog-item-id">{item.id.split('-')[0]}</span>
                                    </td>
                                    <td className="pfc-backlog-td">
                                        {item.status && <PFCStatusBadge name={item.status.name} />}
                                    </td>
                                    <td className="pfc-backlog-td pfc-backlog-td--priority">
                                        {item.priority !== undefined && PRIORITY_ICONS[item.priority]}
                                    </td>
                                    <td className="pfc-backlog-td pfc-backlog-td--assignee">
                                        {item.owning_disc ? (
                                            <span className="pfc-backlog-assignee">{item.owning_disc.name}</span>
                                        ) : (
                                            <span className="pfc-backlog-unassigned">--</span>
                                        )}
                                    </td>
                                    <td className="pfc-backlog-td pfc-backlog-td--parent">
                                        {item.parent_name || '--'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="pfc-backlog-create-row">
                <PFCInlineCreate
                    itemType="TASK"
                    onSubmit={(name) => onCreateItem(name, 'TASK')}
                />
            </div>
        </div>
    );
}
