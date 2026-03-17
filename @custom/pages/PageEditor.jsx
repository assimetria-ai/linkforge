import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * PageEditor - Simple no-code page builder component
 * Allows users to create and edit pages with drag-and-drop blocks
 */
export default function PageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      setLoading(true);
      if (id) {
        const response = await fetch(`/api/pages/${id}`);
        if (!response.ok) throw new Error('Failed to load page');
        const data = await response.json();
        setPage(data);
        setBlocks(JSON.parse(data.content || '[]'));
      }
    } catch (error) {
      console.error('Error loading page:', error);
      alert('Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const savePage = async () => {
    try {
      setSaving(true);
      const payload = {
        ...page,
        content: JSON.stringify(blocks),
      };

      const response = await fetch(
        id ? `/api/pages/${id}` : '/api/pages',
        {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error('Failed to save page');
      const saved = await response.json();
      
      if (!id) {
        navigate(`/pages/${saved.id}/edit`);
      }
      alert('Page saved successfully!');
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const addBlock = (type) => {
    const newBlock = {
      id: Date.now(),
      type,
      content: type === 'text' ? 'New text block' : '',
      style: {},
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id, updates) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (id, direction) => {
    const index = blocks.findIndex(b => b.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  if (loading) {
    return <div className="loading">Loading page editor...</div>;
  }

  return (
    <div className="page-editor">
      <div className="editor-header">
        <h1>{id ? 'Edit Page' : 'Create New Page'}</h1>
        <div className="editor-actions">
          <button onClick={() => navigate('/pages')} disabled={saving}>
            Cancel
          </button>
          <button onClick={savePage} disabled={saving}>
            {saving ? 'Saving...' : 'Save Page'}
          </button>
        </div>
      </div>

      <div className="editor-meta">
        <input
          type="text"
          placeholder="Page Title"
          value={page?.title || ''}
          onChange={(e) => setPage({ ...page, title: e.target.value })}
        />
        <input
          type="text"
          placeholder="Page Slug (URL)"
          value={page?.slug || ''}
          onChange={(e) => setPage({ ...page, slug: e.target.value })}
        />
      </div>

      <div className="editor-layout">
        <div className="block-palette">
          <h3>Add Blocks</h3>
          <button onClick={() => addBlock('text')}>📝 Text</button>
          <button onClick={() => addBlock('heading')}>🔤 Heading</button>
          <button onClick={() => addBlock('image')}>🖼️ Image</button>
          <button onClick={() => addBlock('button')}>🔘 Button</button>
          <button onClick={() => addBlock('divider')}>➖ Divider</button>
        </div>

        <div className="canvas">
          {blocks.length === 0 ? (
            <div className="empty-state">
              <p>No blocks yet. Add some from the palette!</p>
            </div>
          ) : (
            blocks.map((block, index) => (
              <div key={block.id} className="block">
                <div className="block-controls">
                  <button onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>
                    ⬆️
                  </button>
                  <button
                    onClick={() => moveBlock(block.id, 'down')}
                    disabled={index === blocks.length - 1}
                  >
                    ⬇️
                  </button>
                  <button onClick={() => deleteBlock(block.id)}>🗑️</button>
                </div>

                <div className="block-content">
                  {block.type === 'text' && (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Enter text..."
                    />
                  )}
                  {block.type === 'heading' && (
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Enter heading..."
                    />
                  )}
                  {block.type === 'image' && (
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      placeholder="Image URL..."
                    />
                  )}
                  {block.type === 'button' && (
                    <div>
                      <input
                        type="text"
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        placeholder="Button text..."
                      />
                      <input
                        type="text"
                        value={block.url || ''}
                        onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                        placeholder="Button URL..."
                      />
                    </div>
                  )}
                  {block.type === 'divider' && <hr />}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="preview">
          <h3>Preview</h3>
          <div className="preview-content">
            {blocks.map((block) => (
              <div key={block.id} className={`preview-block block-${block.type}`}>
                {block.type === 'text' && <p>{block.content}</p>}
                {block.type === 'heading' && <h2>{block.content}</h2>}
                {block.type === 'image' && block.content && (
                  <img src={block.content} alt="Preview" />
                )}
                {block.type === 'button' && (
                  <button>{block.content || 'Button'}</button>
                )}
                {block.type === 'divider' && <hr />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page-editor {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .editor-actions {
          display: flex;
          gap: 10px;
        }

        .editor-meta {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .editor-meta input {
          flex: 1;
          padding: 10px;
          font-size: 16px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .editor-layout {
          display: grid;
          grid-template-columns: 200px 1fr 300px;
          gap: 20px;
        }

        .block-palette {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
        }

        .block-palette h3 {
          margin-top: 0;
        }

        .block-palette button {
          display: block;
          width: 100%;
          margin-bottom: 10px;
          padding: 10px;
          text-align: left;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
        }

        .block-palette button:hover {
          background: #e8e8e8;
        }

        .canvas {
          min-height: 400px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 40px;
        }

        .block {
          margin-bottom: 15px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 4px;
          position: relative;
        }

        .block-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          gap: 5px;
        }

        .block-controls button {
          padding: 5px 10px;
          border: 1px solid #ddd;
          background: white;
          border-radius: 4px;
          cursor: pointer;
        }

        .block-content textarea,
        .block-content input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-top: 5px;
        }

        .block-content textarea {
          min-height: 100px;
          resize: vertical;
        }

        .preview {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
        }

        .preview h3 {
          margin-top: 0;
        }

        .preview-content {
          background: white;
          padding: 20px;
          border-radius: 4px;
        }

        .preview-block {
          margin-bottom: 15px;
        }

        .loading {
          text-align: center;
          padding: 40px;
        }

        button {
          padding: 10px 20px;
          border: 1px solid #ddd;
          background: #007bff;
          color: white;
          border-radius: 4px;
          cursor: pointer;
        }

        button:hover:not(:disabled) {
          background: #0056b3;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
