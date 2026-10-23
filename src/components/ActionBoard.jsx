import { useState, useMemo } from "react";
import {
  ListChecks,
  Plus,
  X,
  ChevronDown,
  User,
  Calendar,
  Flag,
  CheckSquare,
  Square,
} from "lucide-react";

const PRIORITY_STYLES = {
  high: {
    label: "High",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border border-red-200",
  },
  medium: {
    label: "Medium",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border border-amber-200",
  },
  low: {
    label: "Low",
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border border-gray-200",
  },
};

const COLUMNS = [
  {
    key: "open",
    label: "Open",
    accentBorder: "border-t-blue-500",
    badgeBg: "bg-blue-100 text-blue-700",
  },
  {
    key: "inprogress",
    label: "In Progress",
    accentBorder: "border-t-amber-500",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  {
    key: "done",
    label: "Done",
    accentBorder: "border-t-emerald-500",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "inprogress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function RepAvatar({ rep }) {
  if (!rep) {
    return (
      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
        <User size={12} className="text-gray-400" />
      </span>
    );
  }
  const initials = rep.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const s = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold ${s.bg} ${s.text} ${s.border}`}
    >
      <Flag size={10} />
      {s.label}
    </span>
  );
}

function ActionCard({ item, reps, onUpdateItem, isSelected, onSelect }) {
  const rep = reps.find((r) => r.id === item.repId);

  const handleStatusChange = (newStatus) => {
    onUpdateItem(item.id, { status: newStatus });
    onSelect(null);
  };

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-3 mb-2 transition-colors cursor-pointer ${
        isSelected ? "border-blue-400" : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={() => onSelect(isSelected ? null : item.id)}
    >
      {/* Top row: priority + date */}
      <div className="flex items-center justify-between mb-1.5">
        <PriorityBadge priority={item.priority} />
        {item.date && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Calendar size={10} />
            {item.date}
          </span>
        )}
      </div>

      {/* Action text */}
      <p className="text-sm text-gray-800 font-medium leading-snug mb-1">
        {item.text}
      </p>

      {/* Company / Deal */}
      {(item.company || item.dealName) && (
        <p className="text-xs text-gray-500 mb-2">
          {[item.company, item.dealName].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Bottom row: rep avatar + name */}
      <div className="flex items-center gap-1.5 mt-1">
        <RepAvatar rep={rep} />
        {rep ? (
          <span className="text-xs text-gray-500">{rep.name}</span>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        )}
      </div>

      {/* Inline status selector */}
      {isSelected && (
        <div
          className="mt-3 pt-2 border-t border-gray-100 flex gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              className={`flex-1 text-xs py-1 px-2 rounded-full border font-medium transition-colors ${
                item.status === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemForm({ reps, defaultStatus = "open", onSave, onCancel }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    text: "",
    company: "",
    dealName: "",
    repId: "",
    priority: "medium",
    status: defaultStatus,
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    if (!form.text.trim()) return;
    onSave({
      id: `action-${Date.now()}`,
      date: today,
      ...form,
      text: form.text.trim(),
      company: form.company.trim(),
      dealName: form.dealName.trim(),
    });
  };

  const inputCls =
    "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400";
  const selectCls =
    "w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700";

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-3 mb-2">
      <div className="space-y-2">
        <input
          className={inputCls}
          placeholder="Action item description *"
          value={form.text}
          onChange={set("text")}
          autoFocus
        />
        <input
          className={inputCls}
          placeholder="Company (optional)"
          value={form.company}
          onChange={set("company")}
        />
        <input
          className={inputCls}
          placeholder="Deal name (optional)"
          value={form.dealName}
          onChange={set("dealName")}
        />
        <select className={selectCls} value={form.repId} onChange={set("repId")}>
          <option value="">Assign rep (optional)</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            className={selectCls}
            value={form.priority}
            onChange={set("priority")}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <select
            className={selectCls}
            value={form.status}
            onChange={set("status")}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSave}
          disabled={!form.text.trim()}
          className="flex-1 text-sm bg-blue-600 text-white rounded-lg py-1.5 font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 text-sm bg-gray-100 text-gray-600 rounded-lg py-1.5 font-medium hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function KanbanColumn({
  column,
  items,
  reps,
  onUpdateItem,
  onAddItem,
  selectedId,
  onSelect,
}) {
  const [showForm, setShowForm] = useState(false);

  const handleSave = (item) => {
    onAddItem({ ...item, status: column.key });
    setShowForm(false);
  };

  return (
    <div
      className={`bg-gray-50 rounded-xl border border-gray-200 border-t-4 ${column.accentBorder} p-3 flex-1 min-h-[400px] flex flex-col`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-700">
          {column.label}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${column.badgeBg}`}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1">
        {items.map((item) => (
          <ActionCard
            key={item.id}
            item={item}
            reps={reps}
            onUpdateItem={onUpdateItem}
            isSelected={selectedId === item.id}
            onSelect={onSelect}
          />
        ))}

        {/* Inline add form */}
        {showForm && (
          <AddItemForm
            reps={reps}
            defaultStatus={column.key}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
          />
        )}
      </div>

      {/* Add button at bottom of column */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-2 border border-dashed border-gray-300 hover:border-blue-300 transition-colors"
        >
          <Plus size={13} />
          Add item
        </button>
      )}
    </div>
  );
}

export default function ActionBoard({ boardItems, reps, onUpdateItem, onAddItem }) {
  const [search, setSearch] = useState("");
  const [filterRep, setFilterRep] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showGlobalForm, setShowGlobalForm] = useState(false);

  const filtered = useMemo(() => {
    return (boardItems || []).filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        item.text?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        item.dealName?.toLowerCase().includes(q);
      const matchRep = !filterRep || item.repId === filterRep;
      const matchPriority = !filterPriority || item.priority === filterPriority;
      return matchSearch && matchRep && matchPriority;
    });
  }, [boardItems, search, filterRep, filterPriority]);

  const isEmpty = (boardItems || []).length === 0;

  const selectCls =
    "text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-700 cursor-pointer";

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            className="w-56 text-sm border border-gray-200 rounded-lg pl-3 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
            placeholder="Search action items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Rep filter */}
        <div className="relative flex items-center">
          <select
            className={selectCls}
            value={filterRep}
            onChange={(e) => setFilterRep(e.target.value)}
          >
            <option value="">All Reps</option>
            {(reps || []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority filter */}
        <div className="relative flex items-center">
          <select
            className={selectCls}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Count badge */}
        <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-600 border border-gray-200">
          {filtered.length} item{filtered.length !== 1 ? "s" : ""}
        </span>

        {/* Global add button */}
        <button
          onClick={() => setShowGlobalForm(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} />
          Add Action Item
        </button>
      </div>

      {/* Global add form (modal-like inline) */}
      {showGlobalForm && (
        <div className="bg-white border border-blue-200 rounded-xl shadow-md p-4 max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">
              New Action Item
            </span>
            <button
              onClick={() => setShowGlobalForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={15} />
            </button>
          </div>
          <AddItemForm
            reps={reps || []}
            defaultStatus="open"
            onSave={(item) => {
              onAddItem(item);
              setShowGlobalForm(false);
            }}
            onCancel={() => setShowGlobalForm(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-center px-6 py-12">
          <ListChecks size={36} className="text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-500 mb-1">
            No action items yet
          </p>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Action items from imported call records will appear here. You can
            also add items manually.
          </p>
        </div>
      )}

      {/* Kanban board */}
      {!isEmpty && (
        <div className="flex gap-4 items-start">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.key}
              column={col}
              items={filtered.filter((i) => i.status === col.key)}
              reps={reps || []}
              onUpdateItem={onUpdateItem}
              onAddItem={onAddItem}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
