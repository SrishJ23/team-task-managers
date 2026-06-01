import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Plus, Clock, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  apiGetTasks,
  apiGetProjects,
  apiGetUsers,
  apiCreateTask,
  apiUpdateTaskStatus,
  apiDeleteTask,
} from '../lib/db';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [quickAdd, setQuickAdd] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDescription, setQuickDescription] = useState('');
  const [quickDueDate, setQuickDueDate] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { user } = useContext(AuthContext);

  const fetchData = () => {
    try {
      const tasksData = apiGetTasks(user);
      const projData = apiGetProjects();
      setTasks(tasksData);
      setProjects(projData);
      if (projData.length > 0) setProjectId(projData[0].id);

      if (user?.role === 'Admin') {
        const usersData = apiGetUsers();
        setUsers(usersData);
        if (usersData.length > 0) setAssignedTo(usersData[0].id);
      }
    } catch {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleQuickAdd = (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      apiCreateTask({
        title: quickTitle.trim(),
        description: quickDescription.trim(),
        projectId: projects[0]?.id || '',
        assignedTo: users[0]?.id || '',
        dueDate: quickDueDate || today,
      }, user);
      toast.success('Task added!');
      setQuickTitle('');
      setQuickDescription('');
      setQuickDueDate('');
      setQuickAdd(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding task');
    }
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    try {
      apiCreateTask({ title, description, projectId, assignedTo, dueDate }, user);
      toast.success('Task created!');
      setIsModalOpen(false);
      setTitle(''); setDescription(''); setDueDate('');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating task');
    }
  };

  const updateTaskStatus = (taskId, newStatus) => {
    try {
      apiUpdateTaskStatus(taskId, newStatus, user);
      fetchData();
    } catch { toast.error('Failed to update task'); }
  };

  const handleDeleteTask = (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      apiDeleteTask(taskId, user);
      fetchData();
      toast.success('Task deleted');
    } catch { toast.error('Failed to delete task'); }
  };

  const handleDragStart = (e, taskId) => e.dataTransfer.setData('taskId', taskId);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (e, status) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === parseInt(taskId));
      if (task && task.status !== status) updateTaskStatus(taskId, status);
    }
  };

  const renderTaskCard = (task) => (
    <div
      key={task.id}
      className="kanban-card"
      draggable
      onDragStart={(e) => handleDragStart(e, task.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4 }}>{task.title}</h4>
          <button
            onClick={() => handleDeleteTask(task.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: '2px' }}
          >
            <Trash2 size={14} />
          </button>
      </div>

      {task.description && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{task.description}</p>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {task.projectName && (
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(232,98,42,0.12)', borderRadius: '4px', color: 'var(--accent)', fontWeight: 500 }}>
            {task.projectName}
          </span>
        )}
        {user?.role === 'Admin' && task.assignedUserName && (
          <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(255,255,255,0.07)', borderRadius: '4px', color: 'var(--text-muted)' }}>
            👤 {task.assignedUserName}
          </span>
        )}
      </div>

      {task.dueDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: new Date(task.dueDate) < new Date() && task.status !== 'Completed' ? 'var(--danger)' : 'var(--text-muted)' }}>
          <Clock size={12} />
          {format(new Date(task.dueDate), 'MMM d, yyyy')}
        </div>
      )}
    </div>
  );

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Loading tasks…</div>;

  const statuses = ['Pending', 'In Progress', 'Completed'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '4px' }}>Tasks</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drag cards across columns to update status</p>
        </div>
        {user?.role === 'Admin' && (
          <button className="glass-button" onClick={() => setIsModalOpen(true)}>
            <Plus size={17} />
            New Task
          </button>
        )}
      </div>

      <div className="kanban-board">
      {statuses.map((status) => {
          const colTasks = tasks.filter(t => t.status === status);
          const isQuickAdding = quickAdd === status;
          return (
            <div
              key={status}
              className="kanban-column"
              onDrop={(e) => handleDrop(e, status)}
              onDragOver={handleDragOver}
            >
              <div className={`kanban-header ${status === 'In Progress' ? 'progress' : status.toLowerCase()}`}>
                <span>{status}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="count">{colTasks.length}</span>
                  <button
                    onClick={() => { setQuickAdd(isQuickAdding ? null : status); setQuickTitle(''); setQuickDescription(''); setQuickDueDate(''); }}
                    title="Add task"
                    style={{
                      background: isQuickAdding ? 'rgba(232,98,42,0.25)' : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      color: isQuickAdding ? 'var(--accent)' : 'var(--text-muted)',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      lineHeight: 1,
                      transition: 'all 0.18s',
                      flexShrink: 0,
                      fontWeight: 300,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(232,98,42,0.2)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { if (!isQuickAdding) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="kanban-body">
                {colTasks.map(renderTaskCard)}
                {colTasks.length === 0 && !isQuickAdding && (
                  <div className="kanban-empty">No tasks here</div>
                )}
              </div>

              <div className="quick-add-area" style={{ display: isQuickAdding ? 'block' : 'none' }}>
                  <form className="quick-add-form" onSubmit={handleQuickAdd}>
                    <input
                      autoFocus
                      placeholder="Task title…"
                      value={quickTitle}
                      onChange={e => setQuickTitle(e.target.value)}
                    />
                    <textarea
                      placeholder="Description (optional)…"
                      value={quickDescription}
                      onChange={e => setQuickDescription(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                        width: '100%',
                        resize: 'vertical',
                        minHeight: '60px'
                      }}
                    />
                    <input
                      type="date"
                      value={quickDueDate}
                      onChange={e => setQuickDueDate(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--bg)',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: "'DM Sans', sans-serif",
                        width: '100%',
                      }}
                    />
                    <div className="quick-add-actions">
                      <button type="submit" className="btn-add">Add</button>
                      <button type="button" className="btn-cancel" onClick={() => { setQuickAdd(null); setQuickTitle(''); setQuickDescription(''); setQuickDueDate(''); }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>New Task</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label>Task Title *</label>
                <input className="glass-input" placeholder="What needs to be done?" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="glass-input" rows="2" placeholder="Optional details…" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Project *</label>
                  <select className="glass-input" value={projectId} onChange={e => setProjectId(e.target.value)} style={{ backgroundColor: 'var(--surface-2)' }} required>
                    <option value="" disabled>Select…</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To *</label>
                  <select className="glass-input" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} style={{ backgroundColor: 'var(--surface-2)' }} required>
                    <option value="" disabled>Select…</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input type="date" className="glass-input" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button type="button" className="glass-button" style={{ background: 'var(--surface-2)', color: 'var(--text)' }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="glass-button">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
