import { useState } from 'react';
import { ChevronRight, ChevronDown, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PFCInlineCreate } from './PFCInlineCreate';
import { PFCStatusBadge } from './PFCStatusBadge';
import type { PFCAgileItem } from '../types';
import './PFCNavTree.css';

interface PFCNavTreeProps {
    items: PFCAgileItem[];
    selectedItemId?: string | null;
    filterEpicId: string | null;
    filterStoryId: string | null;
    onItemSelect: (item: PFCAgileItem) => void;
    onFilterEpic: (epicId: string | null) => void;
    onFilterStory: (storyId: string | null) => void;
    onCreateItem: (name: string, type: 'EPIC' | 'STORY' | 'TASK', parentId?: string) => Promise<void>;
}

export function PFCNavTree({
    items, selectedItemId, filterEpicId, filterStoryId,
    onItemSelect, onFilterEpic, onFilterStory, onCreateItem
}: PFCNavTreeProps) {
    const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
    const navigate = useNavigate();

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

    const handleFilterEpic = (epicId: string) => {
        if (filterEpicId === epicId) {
            onFilterEpic(null);
        } else {
            onFilterEpic(epicId);
            onFilterStory(null);
        }
    };

    const handleFilterStory = (storyId: string) => {
        if (filterStoryId === storyId) {
            onFilterStory(null);
        } else {
            onFilterStory(storyId);
        }
    };

    const getEpicStories = (epicId: string) => stories.filter(s => s.parent_id === epicId);

    const getCompletionStats = (epicId: string) => {
        const epicStories = getEpicStories(epicId);
        const epicStoryIds = epicStories.map(s => s.id);
        const tasks = items.filter(i => i.item_type === 'TASK' && epicStoryIds.includes(i.parent_id || ''));
        const done = tasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
        return { total: tasks.length, done };
    };

    return (
        <div className="pfc-nav-tree">
            <h2 className="pfc-nav-tree-title">WORK ITEMS</h2>

            <div className="pfc-nav-tree-list">
                {epics.length === 0 ? (
                    <div className="pfc-nav-tree-empty">No epics yet. Create one to get started.</div>
                ) : (
                    epics.map(epic => {
                        const epicStories = getEpicStories(epic.id);
                        const isExpanded = expandedEpics.has(epic.id);
                        const isSelected = selectedItemId === epic.id;
                        const isFiltered = filterEpicId === epic.id;
                        const stats = getCompletionStats(epic.id);

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
                                        onDoubleClick={() => navigate(`/pfc/epic/${epic.id}`)}
                                        title={`${epic.name} (double-click to drill down)`}
                                    >
                                        {epic.name}
                                    </span>
                                    {stats.total > 0 && (
                                        <span className="pfc-nav-tree-badge" title={`${stats.done}/${stats.total} tasks done`}>
                                            {stats.done}/{stats.total}
                                        </span>
                                    )}
                                    <button
                                        className={`pfc-nav-tree-filter ${isFiltered ? 'pfc-nav-tree-filter--active' : ''}`}
                                        onClick={() => handleFilterEpic(epic.id)}
                                        title={isFiltered ? 'Clear filter' : 'Filter board to this epic'}
                                    >
                                        <Filter size={11} />
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="pfc-nav-tree-children">
                                        {epicStories.map(story => {
                                            const isStorySelected = selectedItemId === story.id;
                                            const isStoryFiltered = filterStoryId === story.id;

                                            return (
                                                <div
                                                    key={story.id}
                                                    className={`pfc-nav-tree-story ${isStorySelected ? 'pfc-nav-tree-story--selected' : ''}`}
                                                >
                                                    <span
                                                        className="pfc-nav-tree-story-name"
                                                        onClick={() => onItemSelect(story)}
                                                        onDoubleClick={() => navigate(`/pfc/story/${story.id}`)}
                                                        title={`${story.name} (double-click to drill down)`}
                                                    >
                                                        {story.name}
                                                    </span>
                                                    {story.status && (
                                                        <PFCStatusBadge name={story.status.name} />
                                                    )}
                                                    <button
                                                        className={`pfc-nav-tree-filter pfc-nav-tree-filter--story ${isStoryFiltered ? 'pfc-nav-tree-filter--active' : ''}`}
                                                        onClick={() => handleFilterStory(story.id)}
                                                        title={isStoryFiltered ? 'Clear filter' : 'Filter to this story\'s tasks'}
                                                    >
                                                        <Filter size={9} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                        <PFCInlineCreate
                                            itemType="STORY"
                                            parentId={epic.id}
                                            onSubmit={(name) => onCreateItem(name, 'STORY', epic.id)}
                                            compact
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {(filterEpicId || filterStoryId) && (
                <button className="pfc-nav-tree-clear-filter" onClick={() => { onFilterEpic(null); onFilterStory(null); }}>
                    Clear Filter
                </button>
            )}

            <div className="pfc-nav-tree-actions">
                <PFCInlineCreate
                    itemType="EPIC"
                    onSubmit={(name) => onCreateItem(name, 'EPIC')}
                />
            </div>
        </div>
    );
}
