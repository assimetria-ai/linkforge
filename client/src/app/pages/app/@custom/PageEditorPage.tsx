import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/@system/ui/button';
import { Card } from '@/components/@system/Card/Card';
import { Input } from '@/components/@system/ui/input';
import { Label } from '@/components/@system/ui/label';
import { Alert } from '@/components/@system/Alert/Alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/@system/Tabs/Tabs';

interface Block {
  id: string;
  type: 'hero' | 'text' | 'image' | 'cta' | 'features';
  content: Record<string, any>;
  order: number;
}

interface Page {
  id: number;
  name: string;
  slug: string;
  template_id: number | null;
  blocks: Block[];
  status: 'draft' | 'published';
  published_at: string | null;
}

const BLOCK_TYPES = [
  { type: 'hero', label: 'Hero Section', icon: '🎯' },
  { type: 'text', label: 'Text Block', icon: '📝' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'cta', label: 'Call to Action', icon: '🎪' },
  { type: 'features', label: 'Features', icon: '⭐' },
];

export function PageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, [id]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pages/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (!response.ok) throw new Error('Failed to load page');
      
      const data = await response.json();
      setPage(data);
      setBlocks(data.blocks || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load page');
      setLoading(false);
    }
  };

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type: type as any,
      content: getDefaultContent(type),
      order: blocks.length
    };
    setBlocks([...blocks, newBlock]);
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'hero':
        return { title: 'New Hero Title', subtitle: 'Hero subtitle', cta: 'Get Started' };
      case 'text':
        return { text: 'Enter your text here...' };
      case 'image':
        return { url: '', alt: 'Image description' };
      case 'cta':
        return { title: 'Take Action', buttonText: 'Click Here', buttonUrl: '#' };
      case 'features':
        return { title: 'Features', items: [] };
      default:
        return {};
    }
  };

  const updateBlock = (blockId: string, content: Record<string, any>) => {
    setBlocks(blocks.map(b => 
      b.id === blockId ? { ...b, content: { ...b.content, ...content } } : b
    ));
  };

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter(b => b.id !== blockId));
    if (selectedBlock === blockId) setSelectedBlock(null);
  };

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    newBlocks.forEach((block, i) => block.order = i);
    setBlocks(newBlocks);
  };

  const savePage = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const response = await fetch(`/api/pages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ blocks })
      });
      
      if (!response.ok) throw new Error('Failed to save page');
      
      setSuccess('Page saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save page');
      setSaving(false);
    }
  };

  const publishPage = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await savePage();
      
      const response = await fetch(`/api/pages/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to publish page');
      
      setSuccess('Page published successfully!');
      await loadPage();
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish page');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="p-6">
        <Alert variant="destructive">Page not found</Alert>
      </div>
    );
  }

  const selected = blocks.find(b => b.id === selectedBlock);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/app/pages')}>
            ← Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{page.name}</h1>
            <p className="text-sm text-gray-500">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.status === 'draft' && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
              Draft
            </span>
          )}
          {page.status === 'published' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Published
            </span>
          )}
          <Button variant="outline" onClick={savePage} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={publishPage} disabled={saving}>
            {page.status === 'published' ? 'Update' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mx-6 mt-4">
          <Alert variant="destructive" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}
      {success && (
        <div className="mx-6 mt-4">
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </div>
      )}

      {/* Main Editor */}
      <div className="flex flex-1 overflow-hidden">
        {/* Block Palette Sidebar */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Add Blocks</h2>
          <div className="space-y-2">
            {BLOCK_TYPES.map(({ type, label, icon }) => (
              <Button
                key={type}
                variant="outline"
                className="w-full justify-start"
                onClick={() => addBlock(type)}
              >
                <span className="mr-2">{icon}</span>
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 bg-gray-100 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {blocks.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-500">No blocks yet. Add blocks from the sidebar to start building your page.</p>
              </Card>
            ) : (
              blocks.map((block, index) => (
                <Card
                  key={block.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedBlock === block.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedBlock(block.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">
                      {BLOCK_TYPES.find(t => t.type === block.type)?.icon}{' '}
                      {BLOCK_TYPES.find(t => t.type === block.type)?.label}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                        disabled={index === blocks.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {block.type === 'hero' && <div>{block.content.title}</div>}
                    {block.type === 'text' && <div>{block.content.text?.substring(0, 100)}</div>}
                    {block.type === 'image' && <div>Image: {block.content.url || '(no URL)'}</div>}
                    {block.type === 'cta' && <div>{block.content.title}</div>}
                    {block.type === 'features' && <div>{block.content.title}</div>}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Properties Panel */}
        {selected && (
          <div className="w-80 border-l bg-white p-4 overflow-y-auto">
            <h2 className="font-semibold mb-4">Block Properties</h2>
            <div className="space-y-4">
              {selected.type === 'hero' && (
                <>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={selected.content.title || ''}
                      onChange={(e) => updateBlock(selected.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Subtitle</Label>
                    <Input
                      value={selected.content.subtitle || ''}
                      onChange={(e) => updateBlock(selected.id, { subtitle: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CTA Button</Label>
                    <Input
                      value={selected.content.cta || ''}
                      onChange={(e) => updateBlock(selected.id, { cta: e.target.value })}
                    />
                  </div>
                </>
              )}
              {selected.type === 'text' && (
                <div>
                  <Label>Text Content</Label>
                  <textarea
                    className="w-full p-2 border rounded-md min-h-[200px]"
                    value={selected.content.text || ''}
                    onChange={(e) => updateBlock(selected.id, { text: e.target.value })}
                  />
                </div>
              )}
              {selected.type === 'image' && (
                <>
                  <div>
                    <Label>Image URL</Label>
                    <Input
                      value={selected.content.url || ''}
                      onChange={(e) => updateBlock(selected.id, { url: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Alt Text</Label>
                    <Input
                      value={selected.content.alt || ''}
                      onChange={(e) => updateBlock(selected.id, { alt: e.target.value })}
                    />
                  </div>
                </>
              )}
              {selected.type === 'cta' && (
                <>
                  <div>
                    <Label>Title</Label>
                    <Input
                      value={selected.content.title || ''}
                      onChange={(e) => updateBlock(selected.id, { title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Button Text</Label>
                    <Input
                      value={selected.content.buttonText || ''}
                      onChange={(e) => updateBlock(selected.id, { buttonText: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Button URL</Label>
                    <Input
                      value={selected.content.buttonUrl || ''}
                      onChange={(e) => updateBlock(selected.id, { buttonUrl: e.target.value })}
                    />
                  </div>
                </>
              )}
              {selected.type === 'features' && (
                <div>
                  <Label>Features Title</Label>
                  <Input
                    value={selected.content.title || ''}
                    onChange={(e) => updateBlock(selected.id, { title: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
