'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Edit, X, Save } from 'lucide-react';

const PagesManagement = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(null);
  
  // Edit form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/pages');
      const data = await res.json();
      if (res.ok && data.success) {
        setPages(data.pages);
      }
    } catch (err) {
      console.log('Error loading pages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/pages');
        const data = await res.json();
        if (!ignore && res.ok && data.success) {
          setPages(data.pages);
        }
      } catch (err) {
        console.log('Error loading pages:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenEdit = (page) => {
    setSelectedPage(page);
    setTitle(page.title);
    setContent(page.content);
  };

  const handleSaveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPage || !title || !content) return;

    try {
      setSaving(true);
      const res = await fetch('/api/admin/pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPage.id || selectedPage._id,
          title,
          content
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedPage(null);
        fetchPages();
      } else {
        alert(data.error || 'Failed to save page contents');
      }
      setSaving(false);
    } catch (err) {
      console.log(err);
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade">
      
      {/* Header */}
      <div className="admin-header-row">
        <div className="admin-title-desc">
          <h2>Page & Policy Content</h2>
          <p>Edit dynamic content bodies for shipping, returns, about, and contact pages.</p>
        </div>
      </div>

      {/* Pages List Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light-muted)' }}>Loading documents registry...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          {pages.map(page => (
            <div key={page.id || page._id || page.slug} className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <h4 style={{ color: 'white', fontFamily: 'Outfit', fontSize: '1.05rem' }}>{page.title}</h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                Slug: /policies/{page.slug}
              </span>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '3.6em', lineHeight: '1.5' }}>
                {page.content}
              </p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}
                onClick={() => handleOpenEdit(page)}
              >
                <Edit size={14} /> Edit Content
              </button>
            </div>
          ))}
        </div>
      )}

      {/* EDIT MODAL */}
      {selectedPage && (
        <div className="admin-modal-overlay">
          <div className="admin-modal animate-slide-up" style={{ maxWidth: '780px' }}>
            <div className="admin-modal-header">
              <h3>Edit Document: {selectedPage.title}</h3>
              <button type="button" onClick={() => setSelectedPage(null)} style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="admin-form-group">
                  <label>Document Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="admin-form-control"
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label>Content Body (Supports Headings, Lists, Paragraphs, Markdown)</label>
                  <textarea 
                    value={content} 
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="admin-form-control"
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.6' }}
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedPage(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PagesManagement;
