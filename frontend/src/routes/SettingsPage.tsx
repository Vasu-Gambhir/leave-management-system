import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ProtectedRoute } from "../lib/auth";
import { organizationAPI } from "../lib/api";

export function SettingsPage() {
  const [organization, setOrganization] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    settings: {
      workingDays: [1, 2, 3, 4, 5],
      default_leave_days: 20,
    },
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
          workingDays: response.data.organization.settings?.workingDays || [
            1, 2, 3, 4, 5,
          ],
          default_leave_days:
            response.data.organization.settings?.default_leave_days || 20,
        },
      });
    } catch (error) {
      console.error("Error loading organization:", error);
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
      toast.success("Settings updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDayToggle = (dayIndex: number) => {
    const updatedWorkingDays = form.settings.workingDays.includes(dayIndex)
      ? form.settings.workingDays.filter((d) => d !== dayIndex)
      : [...form.settings.workingDays, dayIndex];

    setForm({
      ...form,
      settings: {
        ...form.settings,
        workingDays: updatedWorkingDays,
      },
    });
  };

  const weekDays = [
    { name: "Sunday", index: 0 },
    { name: "Monday", index: 1 },
    { name: "Tuesday", index: 2 },
    { name: "Wednesday", index: 3 },
    { name: "Thursday", index: 4 },
    { name: "Friday", index: 5 },
    { name: "Saturday", index: 6 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 shadow-lg"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-8">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <span className="mr-3">⚙️</span>
            Organization Settings
          </h1>
          <p className="mt-2 text-lg text-gray-600 font-medium">
            Configure your organization's leave management settings
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
          <div className="px-8 py-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                <span className="mr-3">🚀</span>
                Configuration Settings
              </h2>
              <p className="text-gray-600 mt-2 font-medium">
                Customize how your organization handles leave management
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                >
                  <span className="mr-2">🏢</span>
                  Organization Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white"
                  placeholder="Enter your organization name"
                  required
                />
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <span className="mr-2">🗺</span>
                  Working Days
                </label>
                <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
                  Select the days when employees are expected to work. Leave
                  calculations will only count these days.
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {weekDays.map((day) => (
                    <label
                      key={day.index}
                      className="relative flex items-center bg-white p-3 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <input
                        type="checkbox"
                        checked={form.settings.workingDays.includes(day.index)}
                        onChange={() => handleWorkingDayToggle(day.index)}
                        className="focus:ring-indigo-500 h-5 w-5 text-indigo-600 border-gray-300 rounded cursor-pointer"
                      />
                      <span className="ml-3 text-sm font-semibold text-gray-700">
                        {day.name}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-indigo-200">
                  <p className="text-sm text-indigo-700 font-medium flex items-center">
                    <span className="mr-2">✅</span>
                    Currently selected:{" "}
                    {form.settings.workingDays
                      .map(
                        (dayIndex) =>
                          weekDays.find((d) => d.index === dayIndex)?.name
                      )
                      .join(", ")}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <label
                  htmlFor="default_leave_days"
                  className="block text-sm font-semibold text-gray-700 mb-2 flex items-center"
                >
                  <span className="mr-2">📅</span>
                  Default Annual Leave Days
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    id="default_leave_days"
                    min="1"
                    max="365"
                    value={form.settings.default_leave_days}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        settings: {
                          ...form.settings,
                          default_leave_days: parseInt(e.target.value),
                        },
                      })
                    }
                    className="block w-32 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold text-center bg-white shadow-sm"
                    required
                  />
                  <span className="text-lg font-semibold text-gray-700">
                    days per year
                  </span>
                </div>
                <p className="mt-3 text-sm text-green-700 font-medium flex items-center">
                  <span className="mr-2">ℹ️</span>
                  Default number of annual leave days for new employees
                </p>
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-8 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
                >
                  {saving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  )}
                  {saving ? "Saving Settings..." : "💾 Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white shadow-xl rounded-2xl border border-gray-100">
          <div className="px-8 py-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="mr-3">📊</span>
              Organization Information
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <dt className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center">
                  <span className="mr-2">🌐</span>
                  Domain
                </dt>
                <dd className="text-lg font-bold text-gray-900">
                  {organization?.domain || "Not set"}
                </dd>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <dt className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center">
                  <span className="mr-2">📅</span>
                  Created
                </dt>
                <dd className="text-lg font-bold text-gray-900">
                  {organization?.created_at
                    ? new Date(organization.created_at).toLocaleDateString()
                    : "N/A"}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
