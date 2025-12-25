import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Trash2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    try {
      setPasswordLoading(true);

      // Update password using Supabase auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError('');

    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion');
      return;
    }

    if (!window.confirm('Are you absolutely sure? This action cannot be undone. All your posts, comments, and data will be permanently deleted.')) {
      return;
    }

    try {
      setDeleteLoading(true);

      if (!user) {
        throw new Error('No user found');
      }

      // Delete user's posts first (cascade should handle comments, likes, bookmarks)
      const { error: postsError } = await supabase
        .from('posts')
        .delete()
        .eq('author_id', user.id);

      if (postsError) {
        console.error('Error deleting posts:', postsError);
      }

      // Delete user's comments
      const { error: commentsError } = await supabase
        .from('comments')
        .delete()
        .eq('author_id', user.id);

      if (commentsError) {
        console.error('Error deleting comments:', commentsError);
      }

      // Delete user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
      }

      // Sign out and redirect
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto slide-up">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-secondary-900 dark:text-white mb-2">Settings</h1>
        <p className="text-secondary-600 dark:text-secondary-400">Manage your account settings and preferences</p>
      </div>

      {/* Change Password Section */}
      <div className="card p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Lock size={20} className="text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-secondary-900 dark:text-white">Change Password</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">Update your account password</p>
          </div>
        </div>

        {passwordError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4 flex items-start">
            <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-400 p-4 rounded-lg mb-4 flex items-start">
            <CheckCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="form-input w-full pr-10"
                placeholder="Enter your current password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="form-input w-full pr-10"
                placeholder="Enter new password (min. 6 characters)"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-input w-full pr-10"
                placeholder="Re-enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            className="btn-primary w-full"
          >
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Delete Account Section */}
      <div className="card p-8 border-red-200 dark:border-red-900/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Trash2 size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-serif font-bold text-secondary-900 dark:text-white">Delete Account</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-400">Permanently delete your account and all data</p>
          </div>
        </div>

        {deleteError && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded-lg mb-4 flex items-start">
            <AlertCircle size={20} className="mr-2 flex-shrink-0 mt-0.5" />
            <span>{deleteError}</span>
          </div>
        )}

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-800 dark:text-red-300 mb-2 font-medium">⚠️ Warning: This action is irreversible!</p>
          <ul className="text-sm text-red-700 dark:text-red-400 space-y-1 list-disc list-inside">
            <li>All your stories will be permanently deleted</li>
            <li>All your comments will be removed</li>
            <li>Your likes and bookmarks will be lost</li>
            <li>Your profile will be completely erased</li>
          </ul>
        </div>

        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div>
            <label htmlFor="deleteConfirmation" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
            </label>
            <input
              type="text"
              id="deleteConfirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="form-input w-full"
              placeholder="Type DELETE"
              required
            />
          </div>

          <button
            type="submit"
            disabled={deleteLoading || deleteConfirmation !== 'DELETE'}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <Trash2 size={18} className="mr-2" />
            {deleteLoading ? 'Deleting Account...' : 'Delete My Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
