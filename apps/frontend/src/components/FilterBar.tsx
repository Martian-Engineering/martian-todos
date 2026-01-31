import type { RefObject } from "react";
import type { TodoPriority, TodoStatus } from "@martian-todos/shared";

export type StatusFilter = "all" | TodoStatus;
export type PriorityFilter = "all" | TodoPriority;
export type SortOption =
  | "created_desc"
  | "created_asc"
  | "priority_desc"
  | "priority_asc"
  | "due_asc"
  | "due_desc";

export interface FilterState {
  search: string;
  status: StatusFilter;
  priority: PriorityFilter;
  sort: SortOption;
}

/**
 * Default filter configuration for the todo list.
 */
export const DEFAULT_FILTERS: FilterState = {
  search: "",
  status: "all",
  priority: "all",
  sort: "created_desc",
};

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const PRIORITY_OPTIONS: Array<{ value: PriorityFilter; label: string }> = [
  { value: "all", label: "All priorities" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
  { value: "priority_desc", label: "Priority high to low" },
  { value: "priority_asc", label: "Priority low to high" },
  { value: "due_asc", label: "Due date soonest" },
  { value: "due_desc", label: "Due date latest" },
];

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  onReset: () => void;
  resultsCount: number;
  totalCount: number;
  searchInputRef: RefObject<HTMLInputElement>;
}

/**
 * Filter bar for searching, filtering, and sorting todos.
 */
export function FilterBar({
  filters,
  onChange,
  onReset,
  resultsCount,
  totalCount,
  searchInputRef,
}: FilterBarProps) {
  // Track whether any filter is currently active for showing reset.
  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.sort !== DEFAULT_FILTERS.sort;

  return (
    <section className="filter-bar">
      {/* Search row with counts and reset action. */}
      <div className="filter-bar__row">
        <div className="filter-bar__search">
          <label htmlFor="todo-search">Search</label>
          <input
            id="todo-search"
            ref={searchInputRef}
            className="input"
            type="search"
            placeholder="Search titles or descriptions"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
        </div>

        <div className="filter-bar__meta">
          <div className="filter-bar__count">
            <span>Showing</span>
            <strong>
              {resultsCount} / {totalCount}
            </strong>
          </div>
          {hasActiveFilters && (
            <button className="button-ghost" onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter controls for status, priority, and sorting. */}
      <div className="filter-bar__row filter-bar__controls">
        <label className="filter-bar__control">
          <span>Status</span>
          <select
            className="select"
            value={filters.status}
            onChange={(event) =>
              onChange({
                ...filters,
                status: event.target.value as StatusFilter,
              })
            }
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-bar__control">
          <span>Priority</span>
          <select
            className="select"
            value={filters.priority}
            onChange={(event) =>
              onChange({
                ...filters,
                priority: event.target.value as PriorityFilter,
              })
            }
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-bar__control">
          <span>Sort</span>
          <select
            className="select"
            value={filters.sort}
            onChange={(event) =>
              onChange({
                ...filters,
                sort: event.target.value as SortOption,
              })
            }
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
