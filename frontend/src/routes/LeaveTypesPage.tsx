import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { ProtectedRoute, useAuth } from "../lib/auth";
import { leaveTypesAPI } from "../lib/api";
import type { LeaveType } from "../lib/api";

export function LeaveTypesPage() {
  const { isAdmin } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: "",
    color: "#3B82F6",
    requires_approval: true,
    max_days_per_year: "",
    carry_forward_allowed: false,
  });

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await leaveTypesAPI.getLeaveTypes();
      setLeaveTypes(response.data.leaveTypes);
    } catch (error) {
      console.error("Error loading leave types:", error);
      toast.error("Failed to load leave types");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const data = {
        ...form,
        max_days_per_year: form.max_days_per_year
          ? parseInt(form.max_days_per_year)
          : undefined,
        is_active: true,
      };

      if (editingType) {
        await leaveTypesAPI.updateLeaveType(editingType.id, data);
        toast.success("Leave type updated successfully");
      } else {
        await leaveTypesAPI.createLeaveType(data);
        toast.success("Leave type created successfully");
      }

      setShowModal(false);
      setEditingType(null);
      resetForm();
      loadLeaveTypes();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to save leave type");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      color: "#3B82F6",
      requires_approval: true,
      max_days_per_year: "",
      carry_forward_allowed: false,
    });
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setForm({
      name: leaveType.name,
      color: leaveType.color,
      requires_approval: leaveType.requires_approval,
      max_days_per_year: leaveType.max_days_per_year?.toString() || "",
      carry_forward_allowed: leaveType.carry_forward_allowed,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id: string) => {
    try {
      await leaveTypesAPI.toggleLeaveTypeActive(id);
      loadLeaveTypes();
      toast.success("Leave type status updated successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update leave type");
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">📋</span>
              Leave Types
            </h1>
            <p className="mt-2 text-lg text-gray-600 font-medium">
              {isAdmin ? 'Configure the types of leave available in your organization' : 'View the types of leave available in your organization'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetForm();
                setEditingType(null);
                setShowModal(true);
              }}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl"
            >
              <span className="mr-2 text-lg">+</span>
              Add Leave Type
            </button>
          )}
        </div>

        <div className="bg-white shadow-xl overflow-hidden rounded-2xl border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600 shadow-lg mx-auto"></div>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
              </div>
              <p className="mt-4 text-lg text-gray-600 font-medium">
                Loading leave types...
              </p>
            </div>
          ) : leaveTypes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <p className="text-xl text-gray-500 font-medium">
                No leave types configured yet.
              </p>
              <p className="text-gray-400 mt-2">
                Click "Add Leave Type" to get started.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {leaveTypes.map((leaveType) => (
                <li key={leaveType.id}>
                  <div className="px-8 py-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-indigo-25 hover:to-purple-25 transition-all duration-200">
                    <div className="flex items-center">
                      <div
                        className="w-6 h-6 rounded-full mr-4 shadow-md ring-2 ring-white"
                        style={{ backgroundColor: leaveType.color }}
                      ></div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center">
                          <span className="mr-2">📝</span>
                          {leaveType.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg ${
                              leaveType.requires_approval
                                ? "text-orange-700 bg-orange-100"
                                : "text-green-700 bg-green-100"
                            }`}
                          >
                            {leaveType.requires_approval
                              ? "✋ Requires approval"
                              : "✅ Auto-approved"}
                          </span>
                          {leaveType.max_days_per_year && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-100">
                              📊 Max {leaveType.max_days_per_year} days/year
                            </span>
                          )}
                          {leaveType.carry_forward_allowed && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-lg text-purple-700 bg-purple-100">
                              🔄 Carry forward allowed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full shadow-md ${
                          leaveType.is_active
                            ? "text-green-700 bg-green-100"
                            : "text-gray-700 bg-gray-100"
                        }`}
                      >
                        {leaveType.is_active ? "🟢 Active" : "⚪ Inactive"}
                      </span>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => handleEdit(leaveType)}
                            className="text-indigo-600 hover:text-indigo-900 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-indigo-50 transition-all duration-200 cursor-pointer"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(leaveType.id)}
                            className="text-gray-600 hover:text-gray-900 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                          >
                            {leaveType.is_active ? "❌ Deactivate" : "✅ Activate"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Modal */}
        {isAdmin && showModal && (
          <div
            className="fixed inset-0 backdrop-blur-md bg-black/20 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="relative p-8 border border-gray-200 w-full max-w-lg shadow-2xl rounded-2xl bg-white/95 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl"></div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                    <span className="mr-3">{editingType ? "✏️" : "➕"}</span>
                    {editingType ? "Edit Leave Type" : "Add Leave Type"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer"
                  >
                    <span className="text-xl">×</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white"
                    placeholder="e.g., Annual Leave, Sick Leave"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🎨 Color
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) =>
                        setForm({ ...form, color: e.target.value })
                      }
                      className="h-12 w-16 border border-gray-300 rounded-xl cursor-pointer"
                    />
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full shadow-md"
                        style={{ backgroundColor: form.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-600">
                        {form.color}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requires_approval}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          requires_approval: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-indigo-600 w-5 h-5 cursor-pointer"
                    />
                    <span className="ml-3 text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">✋</span>
                      Requires approval
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📊 Max days per year (optional)
                  </label>
                  <input
                    type="number"
                    value={form.max_days_per_year}
                    onChange={(e) =>
                      setForm({ ...form, max_days_per_year: e.target.value })
                    }
                    className="block w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium bg-gray-50 hover:bg-white"
                    placeholder="Enter maximum days (leave empty for unlimited)"
                    min="1"
                  />
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-100">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.carry_forward_allowed}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          carry_forward_allowed: e.target.checked,
                        })
                      }
                      className="rounded border-gray-300 text-purple-600 w-5 h-5 cursor-pointer"
                    />
                    <span className="ml-3 text-sm font-semibold text-gray-700 flex items-center">
                      <span className="mr-2">🔄</span>
                      Allow carry forward to next year
                    </span>
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-105 flex items-center"
                  >
                    {submitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    )}
                    {submitting
                      ? "Saving..."
                      : editingType
                      ? "Update Leave Type"
                      : "Create Leave Type"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
