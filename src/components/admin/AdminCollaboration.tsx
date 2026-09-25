import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  FileEdit,
  CheckSquare,
  Plus,
  Trash2,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const AdminCollaboration: React.FC = () => {
  const {
    collabDoc,
    updateCollabDoc,
    collabTasks,
    addCollabTask,
    updateCollabTaskStatus,
    currentUser,
    language,
  } = useStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('All Team');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addCollabTask({
      title: newTaskTitle.trim(),
      assignedTo: newTaskAssignee,
      status: 'pending',
      priority: newTaskPriority,
    });

    setNewTaskTitle('');
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
            {language === 'bn'
              ? 'টিম কোলাবরেশন, লাইভ নোটস ও টাস্ক ম্যানেজার'
              : 'Real-Time Team Collaboration & Operational Tasks'}
          </h1>
          <p className="text-xs text-[#565F52] mt-0.5">
            Simultaneous multi-user document collaboration and task workflow management.
          </p>
        </div>

        {/* Presence Avatars */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#565F52]">Active Now:</span>
          <div className="flex -space-x-1.5">
            <div className="w-7 h-7 rounded-full bg-[#3C6656] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white" title="Farooq (Admin)">
              F
            </div>
            <div className="w-7 h-7 rounded-full bg-[#A87C1F] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white" title="Tanmoy (Operations)">
              T
            </div>
            <div className="w-7 h-7 rounded-full bg-[#182620] text-white flex items-center justify-center font-bold text-[10px] ring-2 ring-white" title="Pooja (Logistics)">
              P
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Shared Collaborative Document */}
        <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9] mb-3">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-[#3C6656]" />
                <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                  Shared Dispatch & Operations Note
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#565F52]">
                Auto-saved · by {collabDoc.updatedBy}
              </span>
            </div>

            <p className="text-xs text-[#565F52] mb-2">
              Changes made here are synced live across all team member devices in real time.
            </p>

            <textarea
              rows={14}
              value={collabDoc.content}
              onChange={(e) => updateCollabDoc(e.target.value)}
              className="w-full font-mono text-xs p-3.5 bg-[#FBFAF5] border border-[#CBCFB9] rounded text-[#0F1913] focus:outline-none focus:border-[#A87C1F] leading-relaxed"
            />
          </div>

          <div className="mt-3 pt-2 border-t border-[#CBCFB9] flex items-center justify-between text-[11px] text-[#565F52]">
            <span>Last revised: {collabDoc.lastModified.slice(0, 19)}</span>
            <span className="text-[#3C6656] font-semibold">Live Real-time Sync Active</span>
          </div>
        </div>

        {/* Right Column: Collaborative Tasks & Kanban */}
        <div className="lg:col-span-6 bg-white p-5 rounded-lg border border-[#CBCFB9] shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#CBCFB9] mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#A87C1F]" />
                <h3 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
                  Team Action Items & Dispatch Tasks
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-[#E4E8D9] text-[#182620] px-2 py-0.5 rounded font-bold">
                {collabTasks.filter((t) => t.status !== 'completed').length} Pending
              </span>
            </div>

            {/* Add Task Form */}
            <form onSubmit={handleAddTask} className="mb-4 bg-[#FBFAF5] p-3 rounded border border-[#CBCFB9] space-y-2 text-xs">
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Enter task title (e.g. Verify 50x B2B Blender carton packing)..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 bg-white border border-[#CBCFB9] rounded p-2 text-[#0F1913] focus:outline-none focus:border-[#A87C1F]"
                />
                <button
                  type="submit"
                  className="bg-[#0F1913] hover:bg-[#182620] text-white px-3.5 py-2 rounded font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 text-[#CC9A2E]" />
                  <span>Add Task</span>
                </button>
              </div>

              <div className="flex gap-3 items-center text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="text-[#565F52]">Assignee:</span>
                  <input
                    type="text"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                    className="bg-white border border-[#CBCFB9] rounded px-2 py-0.5 text-[#0F1913] w-28"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[#565F52]">Priority:</span>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="bg-white border border-[#CBCFB9] rounded px-2 py-0.5 text-[#0F1913]"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </form>

            {/* Task List */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {collabTasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded border text-xs flex items-center justify-between gap-3 transition-colors ${
                      isDone
                        ? 'bg-gray-50 border-gray-200 opacity-60'
                        : 'bg-[#FBFAF5] border-[#CBCFB9]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() =>
                          updateCollabTaskStatus(
                            task.id,
                            isDone ? 'pending' : 'completed'
                          )
                        }
                        className="mt-0.5 accent-[#3C6656] cursor-pointer"
                      />
                      <div>
                        <span
                          className={`font-semibold text-[#0F1913] block ${
                            isDone ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-[#565F52] mt-0.5">
                          <span>Assignee: <b>{task.assignedTo}</b></span>
                          <span>·</span>
                          <span
                            className={`font-bold uppercase ${
                              task.priority === 'high'
                                ? 'text-red-700'
                                : task.priority === 'medium'
                                ? 'text-amber-700'
                                : 'text-gray-500'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <select
                        value={task.status}
                        onChange={(e) =>
                          updateCollabTaskStatus(task.id, e.target.value as any)
                        }
                        className="text-[10px] font-bold bg-white border border-[#CBCFB9] rounded px-1.5 py-0.5 text-[#0F1913]"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In-Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
