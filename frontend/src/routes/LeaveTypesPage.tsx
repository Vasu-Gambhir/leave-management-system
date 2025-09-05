import { useState, useEffect } from 'react';
import { ProtectedRoute } from '../lib/auth';
import { leaveTypesAPI } from '../lib/api';
import type { LeaveType } from '../lib/api';

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [form, setForm] = useState({
    name: '',
    color: '#3B82F6',
    requires_approval: true,
    max_days_per_year: '',
    carry_forward_allowed: false,
  });

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      const response = await leaveTypesAPI.getLeaveTypes();
      setLeaveTypes(response.data.leaveTypes);
    } catch (error) {
      console.error('Error loading leave types:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        max_days_per_year: form.max_days_per_year ? parseInt(form.max_days_per_year) : undefined,
        is_active: true, // New leave types are active by default
      };

      if (editingType) {
        await leaveTypesAPI.updateLeaveType(editingType.id, data);
      } else {
        await leaveTypesAPI.createLeaveType(data);
      }

      setShowModal(false);
      setEditingType(null);
      resetForm();
      loadLeaveTypes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save leave type');
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      color: '#3B82F6',
      requires_approval: true,
      max_days_per_year: '',
      carry_forward_allowed: false,
    });
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingType(leaveType);
    setForm({
      name: leaveType.name,
      color: leaveType.color,
      requires_approval: leaveType.requires_approval,
      max_days_per_year: leaveType.max_days_per_year?.toString() || '',
      carry_forward_allowed: leaveType.carry_forward_allowed,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id: string) => {
    try {
      await leaveTypesAPI.toggleLeaveTypeActive(id);
      loadLeaveTypes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update leave type');
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Types</h1>
            <p className="mt-1 text-sm text-gray-600">
              Configure the types of leave available in your organization
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditingType(null);
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <span className="mr-2">+</span>
            Add Leave Type
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {leaveTypes.map((leaveType) => (
              <li key={leaveType.id}>
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: leaveType.color }}
                    ></div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {leaveType.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {leaveType.requires_approval ? 'Requires approval' : 'Auto-approved'}
                        {leaveType.max_days_per_year && ` • Max ${leaveType.max_days_per_year} days/year`}
                        {leaveType.carry_forward_allowed && ' • Carry forward allowed'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        leaveType.is_active
                          ? 'text-green-700 bg-green-100'
                          : 'text-gray-700 bg-gray-100'
                      }`}
                    >
                      {leaveType.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleEdit(leaveType)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(leaveType.id)}
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                    >
                      {leaveType.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingType ? 'Edit Leave Type' : 'Add Leave Type'}
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Color</label>
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.requires_approval}
                      onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Requires approval</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Max days per year (optional)</label>
                  <input
                    type="number"
                    value={form.max_days_per_year}
                    onChange={(e) => setForm({ ...form, max_days_per_year: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    min="1"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.carry_forward_allowed}
                      onChange={(e) => setForm({ ...form, carry_forward_allowed: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow carry forward</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {editingType ? 'Update' : 'Create'}
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