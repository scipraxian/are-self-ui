import { useState } from 'react';
import { ChevronRight, ChevronDown, Filter, Plus } from 'lucide-react';
import type { PFCAgileItem } from '../types';
import './PFCNavTree.css';

interface PFCNavTreeProps {
    items: PFCAgileItem[];
    selectedItemId?: string | null;
    filterEpicId: string | null;
    onItemSelect: (item: PFCAgileItem) => void;
    onFilterChange: (epicId: string | null) => void;
    onCreateRequest: (type: 'EPIC' | 'STORY' | 'TASK') => void;
}

export function PFCNavTree({ items, selectedItemId, filterEpicId, onItemSelect, onFilterChange, onCreateRequest }: PFCNavTreeProps) {
    const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());

    const epics = items.filter(i => i.item_type === 'EPIC');
    const stories = items.filter(i => i.item_type === 'STORY');

    const toggleExpand = (epicId: string) => {
        setExpandedEpics(prev => {
            const next = new Set(prev);
            if (next.has(epicId)) next.delete(epicId);
            else next.add(epicId);
            return next;
        });
    };

    const handleFilterClick = (epicId: string) => {
        onFilterChange(filterEpicId === epicId ? null : epicId);
    };

    const getEpicStories = (epicId: string) => {
        return stories.filter(s => s.parent_id === epicId);
    };

    return (
        <div className="pfc-nav-tree">
            <h2 className="pfc-nav-tree-title">EPICS</h2>

            <div className="pfc-nav-tree-list">
                {epics.length === 0 ? (
                    <div className="pfc-nav-tree-empty">No epics yet. Create one to get started.</div>
                ) : (
                    epics.map(epic => {
                        const epicStories = getEpicStories(epic.id);
                        const isExpanded = expandedEpics.has(epic.id);
                        const isSelected = selectedItemId === epic.id;
                        const isFiltered = filterEpicId === epic.id;
                        const totalCount = 1 + epicStories.length;

                        return (
                            <div key={epic.id} className="pfc-nav-tree-group">
                                <div className={`pfc-nav-tree-epic ${isSelected ? 'pfc-nav-tree-epic--selected' : ''}`}>
                                    <button
                                        className="pfc-nav-tree-toggle"
                                        onClick={() => toggleExpand(epic.id)}
                                    >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    <span
                                        className="pfc-nav-tree-epic-name"
                                        onClick={() => onItemSelect(epic)}
                                        title={epic.name}
                                    >
                                        {epic.name}
                                    </span>
                                    <span className="pfc-nav-tree-badge">{totalCount}</span>
                                    <button
                                        className={`pfc-nav-tree-filter ${isFiltered ? 'pfc-nav-tree-filter--active' : ''}`}
                                        onClick={() => handleFilterClick(epic.id)}
                                        title={isFiltered ? 'Clear filter' : 'Filter board to this epic'}
                                    >
                                        <Filter size={11} />
                                    </button>
                                </div>

                                {isExpanded && epicStories.length > 0 && (
                                    <div className="pfc-nav-tree-children">
                                        {epicStories.map(story => (
                                            <div
                                                key={story.id}
                                                className={`pfc-nav-tree-story ${selectedItemId === story.id ? 'pfc-nav-tree-story--selected' : ''}`}
                                                onClick={() => onItemSelect(story)}
                                                title={story.name}
                                            >
                                                <span className="pfc-nav-tree-story-name">{story.name}</span>
                                                <span className="pfc-nav-tree-story-status">{story.status?.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {filterEpicId && (
                <button className="pfc-nav-tree-clear-filter" onClick={() => onFilterChange(null)}>
                    Clear Filter
                </button>
            )}

            <div className="pfc-nav-tree-actions">
                <button className="btn-ghost pfc-create-btn--epic" onClick={() => onCreateRequest('EPIC')}>
                    <Plus size={12} /> EPIC
                </button>
                <button className="btn-ghost pfc-create-btn--story" onClick={() => onCreateRequest('STORY')}>
                    <Plus size={12} /> STORY
                </button>
                <button className="btn-ghost pfc-create-btn--task" onClick={() => onCreateRequest('TASK')}>
                    <Plus size={12} /> TASK
                </button>
            </div>
        </div>
    );
}
