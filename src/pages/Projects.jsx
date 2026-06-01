import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Plus, FolderKanban, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiGetProjects, apiCreateProject } from '../lib/db';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  
  const { user } = useContext(AuthContext);

  const fetchProjects = () => {
    try {
      setProjects(apiGetProjects());
    } catch {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreateProject = (e) => {
    e.preventDefault();
    try {
      apiCreateProject(name, description, user?.role);
      toast.success('Project created successfully');
      setIsModalOpen(false);
      setName('');
      setDescription('');
      fetchProjects();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating project');
    }
  };

  if (loading) return <div>Loading projects...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your team's projects</p>
        </div>
        {user?.role === 'Admin' && (
          <button className="glass-button" onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            New Project
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {projects.map(project => (
          <div key={project.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ padding: '12px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '12px' }}>
                <FolderKanban size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>{project.name}</h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', flex: 1 }}>
              {project.description || 'No description provided.'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
              <Calendar size={14} />
              Created {format(new Date(project.createdAt), 'MMM dd, yyyy')}
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
            No projects found. Create one to get started.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel modal-content">
            <h2 style={{ fontSize: '1.5rem' }}>Create New Project</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="glass-input" 
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="glass-button" style={{ background: 'transparent', border: '1px solid var(--glass-border)' }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="glass-button">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
