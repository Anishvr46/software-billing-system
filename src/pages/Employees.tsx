import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Shield, ShieldCheck, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Badge, LoadingOverlay } from '@/components/ui/index';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { getEmployees, updateEmployeeRole, updateEmployeeName } from '@/api/employees';
import { formatDate } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModal, setEditModal] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // New employee form
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'employee'>('employee');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'employee'>('employee');

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  };

  const handleAddEmployee = async () => {
    if (!newEmail || !newName || !newPassword) return toast.error('All fields required');
    setSaving(true);
    try {
      // Sign up new user
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: { data: { name: newName, role: newRole } },
      });
      if (error) throw error;

      // Create profile
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: newName,
          email: newEmail,
          role: newRole,
        });
      }

      toast.success('Employee account created!');
      setModalOpen(false);
      setNewEmail(''); setNewName(''); setNewPassword(''); setNewRole('employee');
      loadEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create employee');
    } finally { setSaving(false); }
  };

  const handleEditEmployee = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await updateEmployeeName(editModal.id, editName);
      await updateEmployeeRole(editModal.id, editRole);
      toast.success('Employee updated!');
      setEditModal(null);
      loadEmployees();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const openEdit = (emp: UserProfile) => {
    setEditModal(emp);
    setEditName(emp.name);
    setEditRole(emp.role);
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {employees.length} employee{employees.length !== 1 ? 's' : ''} registered
            </h3>
          </div>
          <Button icon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            Add Employee
          </Button>
        </div>
      </Card>

      <Card>
        {loading ? <LoadingOverlay /> : employees.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <UserCog size={48} className="mx-auto mb-3 opacity-30" />
            <p>No employees found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {['Employee', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider first:pl-0 last:pr-0 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-3 px-2 pl-0">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${emp.role === 'admin' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                          {emp.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">{emp.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-500">{emp.email}</td>
                    <td className="py-3 px-2">
                      <Badge variant={emp.role === 'admin' ? 'purple' : 'info'}>
                        {emp.role === 'admin' ? <ShieldCheck size={12} className="inline mr-1" /> : <Shield size={12} className="inline mr-1" />}
                        {emp.role}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-slate-400 text-xs">{formatDate(emp.created_at)}</td>
                    <td className="py-3 px-2 pr-0 text-right">
                      <button
                        onClick={() => openEdit(emp)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-all"
                        title="Edit"
                      >
                        <Edit2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Employee"
        size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleAddEmployee}>Create Account</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Employee Name" />
          <Input label="Email Address" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="employee@mobilezone.in" />
          <Input label="Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 characters" />
          <Select
            label="Role"
            value={newRole}
            onChange={e => setNewRole(e.target.value as 'admin' | 'employee')}
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ⚠️ The employee will receive a verification email. They must verify before logging in.
            </p>
          </div>
        </div>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        isOpen={!!editModal}
        onClose={() => setEditModal(null)}
        title="Edit Employee"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleEditEmployee}>Save Changes</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" value={editName} onChange={e => setEditName(e.target.value)} />
          <Select
            label="Role"
            value={editRole}
            onChange={e => setEditRole(e.target.value as 'admin' | 'employee')}
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Employees;
