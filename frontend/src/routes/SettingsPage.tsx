import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../lib/auth';
import { organizationAPI } from '../lib/api';

export function SettingsPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [form, setForm] = useState({
    name: '',
    settings: {
      working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      default_leave_days: 20,
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    try {
      const response = await organizationAPI.getOrganization();
      setOrganization(response.data.organization);
      setForm({
        name: response.data.organization.name,
        settings: {
          working_days: response.data.organization.settings?.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          default_leave_days: response.data.organization.settings?.default_leave_days || 20,
        }
      });
    } catch (error) {
      console.error('Error loading organization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await organizationAPI.updateOrganizationSettings(form);
      loadOrganization();
      alert('Settings updated successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDayToggle = (day: string) => {
    const updatedWorkingDays = form.settings.working_days.includes(day)
      ? form.settings.working_days.filter(d => d !== day)
      : [...form.settings.working_days, day];
    
    setForm({
      ...form,
      settings: {
        ...form.settings,
        working_days: updatedWorkingDays
      }
    });
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Configure your organization's leave management settings
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Working Days
                </label>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {weekDays.map((day) => (
                    <label key={day} className="relative flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          checked={form.settings.working_days.includes(day)}
                          onChange={() => handleWorkingDayToggle(day)}
                          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium text-gray-700">{day}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="default_leave_days" className="block text-sm font-medium text-gray-700">
                  Default Annual Leave Days
                </label>
                <input
                  type="number"
                  id="default_leave_days"
                  min="1"
                  max="365"
                  value={form.settings.default_leave_days}
                  onChange={(e) => setForm({
                    ...form,
                    settings: {
                      ...form.settings,
                      default_leave_days: parseInt(e.target.value)
                    }
                  })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  Default number of annual leave days for new employees
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Organization Information
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Domain</dt>
                <dd className="mt-1 text-sm text-gray-900">{organization?.domain}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}