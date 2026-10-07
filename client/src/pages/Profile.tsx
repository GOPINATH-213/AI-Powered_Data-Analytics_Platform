import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, ShieldCheck, Save, Clock, Key } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user, updateUserProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await updateUserProfile(name, photoURL);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Account Profile</h1>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border text-sm ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
              : 'bg-destructive/15 border-destructive/30 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {/* User Card Info */}
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-center gap-6">
          <img
            src={user?.photoURL || 'https://lh3.googleusercontent.com/a/default-user'}
            alt={user?.name || 'User'}
            className="h-20 w-20 rounded-full object-cover border-2 border-primary"
          />
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary uppercase">
                <Shield className="h-3.5 w-3.5" />
                {user?.role}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-secondary text-secondary-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Active Account
              </span>
            </div>
          </div>
        </div>

        {/* Edit Profile Form */}
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h3 className="font-bold text-lg mb-4">Edit Profile details</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Display Name</label>
              <div className="flex items-center gap-2 border border-border bg-background rounded-lg px-3 py-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Photo URL</label>
              <div className="flex items-center gap-2 border border-border bg-background rounded-lg px-3 py-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  className="bg-transparent text-sm w-full outline-none"
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 transition-all w-full sm:w-auto"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Read Only Metadata details */}
        <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h3 className="font-bold text-lg">System Metadata</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                Firebase UID
              </span>
              <p className="font-mono text-xs truncate" title={user?.firebaseUID}>
                {user?.firebaseUID}
              </p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Organization ID
              </span>
              <p className="font-semibold text-xs">{user?.organizationId || 'None'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;
