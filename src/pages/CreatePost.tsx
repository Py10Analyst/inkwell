import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
  });

  // Check if user is authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  async function ensureUserProfile() {
    if (!user) return null;
    
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .eq('id', user.id)
      .single();
      
    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 is "not found" - other errors should be thrown
      throw profileError;
    }
    
    if (profile) return profile;
    
    // Create a profile if it doesn't exist
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: user.email,
          username: user.email?.split('@')[0] || 'user',
        }
      ])
      .select()
      .single();
      
    if (createError) throw createError;
    return newProfile;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editor || !user) return;

    try {
      setLoading(true);
      setError('');

      // Ensure user has a profile
      const profile = await ensureUserProfile();
      if (!profile) throw new Error('Could not create or find user profile');

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert([
          {
            title,
            content: editor.getHTML(),
            author_id: profile.id,
            published: true,
          }
        ])
        .select()
        .single();

      if (postError) throw postError;
      if (post) {
        navigate(`/post/${post.id}`);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error instanceof Error ? error.message : 'Failed to create post');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-secondary-900 dark:text-white mb-2">Create New Story</h1>
        <p className="text-secondary-600 dark:text-secondary-400">Share your thoughts with the world</p>
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
          <p className="font-medium">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="card p-8 space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your story a captivating title..."
            className="form-input w-full"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
            Content
          </label>
          <div className="prose-custom min-h-[400px] bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg p-6 focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400 focus-within:border-transparent transition-all">
            <EditorContent 
              editor={editor} 
              className="min-h-[360px] text-secondary-900 dark:text-secondary-100 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[360px] [&_.ProseMirror]:text-secondary-900 [&_.ProseMirror]:dark:text-secondary-100 [&_.ProseMirror_p]:text-secondary-900 [&_.ProseMirror_p]:dark:text-secondary-100 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_p]:mb-4 [&_.ProseMirror]:prose [&_.ProseMirror]:dark:prose-invert [&_.ProseMirror]:max-w-none [&_.ProseMirror]:w-full"
            />
          </div>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-2">
            Write your story using the editor above. You can format text, add headings, lists, and more.
          </p>
        </div>
        
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || !title.trim() || !editor?.getText().trim()}
            className="btn-primary flex-1"
          >
            {loading ? 'Publishing...' : 'Publish Story'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}