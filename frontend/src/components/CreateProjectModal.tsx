import React, { useState, useEffect } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { clientApi, projectApi } from '../api/client.ts';
import type { Client } from '../types/index.ts';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New client quick inline form
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setError(null);
      setShowNewClientForm(false);
      clientApi
        .getClients()
        .then((res) => {
          setClients(res.clients || []);
          if (res.clients && res.clients.length > 0) {
            setClientId(res.clients[0].id);
          }
        })
        .catch((err) => console.error('Failed to load clients', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientEmail || !newClientCompany) {
      setError('Please fill in all client fields');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await clientApi.createClient({
        name: newClientName,
        email: newClientEmail,
        company: newClientCompany,
      });
      setClients((prev) => [...prev, res.client]);
      setClientId(res.client.id);
      setShowNewClientForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required');
      return;
    }
    if (!clientId) {
      setError('Please select or create a client');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await projectApi.createProject({
        name,
        description: description || undefined,
        clientId,
      });
      onProjectCreated(res.project);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>
            <FolderPlus size={20} color="#6366f1" />
            <span>Create New Project</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Project Name *
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. Mobile App Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem', fontWeight: 500 }}>
              Description
            </label>
            <textarea
              className="input-control"
              placeholder="Brief project summary and scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>
                Client *
              </label>
              <button
                type="button"
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                {showNewClientForm ? 'Cancel New Client' : '+ New Client'}
              </button>
            </div>

            {showNewClientForm ? (
              <div
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px dashed var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <input
                  type="text"
                  className="input-control"
                  placeholder="Client Contact Name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <input
                  type="email"
                  className="input-control"
                  placeholder="Client Email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
                <input
                  type="text"
                  className="input-control"
                  placeholder="Company Name"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCreateNewClient}
                  disabled={loading}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Save Client
                </button>
              </div>
            ) : (
              <select
                className="input-control"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              >
                {clients.length === 0 && <option value="">No clients found - create one above</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !clientId}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
