import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, ListTodo, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  apiGetDashboard,
  apiGetTasks,
  apiGetProjects,
  apiGetUsers,
  apiCreateTask,
} from '../lib/db';

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  const [metrics, setMetrics] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [allTasks, setAllTasks] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Task creation modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchDashboardData = () => {
    try {
      const metricsData = apiGetDashboard(user);
      const tasksData = apiGetTasks(user);
      setMetrics(metricsData);
      setAllTasks(tasksData);
      const sortedTasks = [...tasksData]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentTasks(sortedTasks);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const openModal = () => {
    const projData = apiGetProjects();
    const usersData = apiGetUsers();
    setProjects(projData);
    setUsers(usersData);
    if (projData.length > 0) setProjectId(projData[0].id);
    if (usersData.length > 0) setAssignedTo(usersData[0].id);
    setIsModalOpen(true);
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    try {
      apiCreateTask({ title, description, projectId, assignedTo, dueDate }, user);
      toast.success('Task created successfully!');
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating task');
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  let displayedTasks = recentTasks;
  let tableTitle = 'Recent Tasks';
  
  if (selectedStatus === 'Total') {
    displayedTasks = allTasks;
    tableTitle = 'All Tasks';
  } else if (selectedStatus === 'Overdue') {
    const today = new Date().toISOString();
    displayedTasks = allTasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'Completed');
    tableTitle = 'Overdue Tasks';
  } else if (selectedStatus) {
    displayedTasks = allTasks.filter(t => t.status === selectedStatus);
    tableTitle = `${selectedStatus} Tasks`;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {user?.name}. Here's what's happening.</p>
        </div>
        {user?.role === 'Admin' && (
          <button
            className="glass-button"
            onClick={openModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} />
            Add Task
          </button>
        )}
      </div>

      <div className="metrics-grid" style={{ marginBottom: '40px' }}>
        <div className="glass-panel metric-card total" onClick={() => setSelectedStatus('Total')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Total Tasks</span>
            <ListTodo size={20} color="var(--primary)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: '700' }}>{metrics.total}</span>
        </div>

        <div className="glass-panel metric-card pending" onClick={() => setSelectedStatus('Pending')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Pending</span>
            <Clock size={20} color="var(--warning)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: '700' }}>{metrics.pending}</span>
        </div>

        <div className="glass-panel metric-card progress" onClick={() => setSelectedStatus('In Progress')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>In Progress</span>
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: '700' }}>{metrics.inProgress}</span>
        </div>

        <div className="glass-panel metric-card completed" onClick={() => setSelectedStatus('Completed')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Completed</span>
            <CheckCircle2 size={20} color="var(--success)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: '700' }}>{metrics.completed}</span>
        </div>

        <div className="glass-panel metric-card overdue" onClick={() => setSelectedStatus('Overdue')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Overdue</span>
            <AlertCircle size={20} color="var(--danger)" />
          </div>
          <span style={{ fontSize: '2.5rem', fontWeight: '700' }}>{metrics.overdue}</span>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{tableTitle}</h2>
          {selectedStatus && (
            <button 
              className="glass-button" 
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              onClick={() => setSelectedStatus(null)}
            >
              Clear Filter
            </button>
          )}
        </div>
        {displayedTasks.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {displayedTasks.map(task => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: '500' }}>{task.title}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{task.projectName || 'General'}</td>
                    <td>
                      <span className={`status-badge ${
                        task.status === 'In Progress' ? 'progress' :
                        task.status === 'Completed' ? 'completed' :
                        task.status === 'Overdue' ? 'overdue' :
                        'pending'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : 'No date'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      {user?.role === 'Admin' && (
        <button
          onClick={openModal}
          title="Add New Task"
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(79, 70, 229, 0.5)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            zIndex: 100,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(79, 70, 229, 0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(79, 70, 229, 0.5)'; }}
        >
          <Plus size={28} color="white" />
        </button>
      )}

      {/* Create Task Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Create New Task</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className="form-group">
                <label>Task Title</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="glass-input" 
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Project</label>
                  <select 
                    className="glass-input" 
                    value={projectId} 
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{ backgroundColor: 'var(--bg-color)' }}
                    required
                  >
                    <option value="" disabled>Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select 
                    className="glass-input" 
                    value={assignedTo} 
                    onChange={(e) => setAssignedTo(e.target.value)}
                    style={{ backgroundColor: 'var(--bg-color)' }}
                    required
                  >
                    <option value="" disabled>Select User</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input 
                  type="date" 
                  className="glass-input" 
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="glass-button" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="glass-button">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
