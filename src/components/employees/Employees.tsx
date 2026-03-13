import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/useTenantStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Users, Plus, Search, Mail, UserCheck, UserPlus, Shield, Clock } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'employees' | 'invitations'>('employees');
  const tenant = useTenantStore((state) => state.currentTenant);
  const role = useTenantStore((state) => state.role);
  
  const [email, setEmail] = useState('');
  const [perms, setPerms] = useState({ can_create_inventory: false, can_view_reports: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    if (!tenant) return;
    
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role, permissions')
      .eq('tenant_id', tenant.id)
      .eq('role', 'employee');
      
    setEmployees(rolesData || []);

    const { data: invsData } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('role', 'employee')
      .order('created_at', { ascending: false });
      
    setInvitations(invsData || []);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !email) return;

    setLoading(true);
    const { error } = await supabase.from('invitations').insert([{
      tenant_id: tenant.id,
      email,
      role: 'employee',
      permissions: perms
    }]);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setEmail('');
      setPerms({ can_create_inventory: false, can_view_reports: false });
      fetchData();
    }
    setLoading(false);
  };

  const maxEmployees = (tenant?.config && typeof tenant.config === 'object' && 'maxEmployees' in tenant.config) 
    ? Number(tenant.config.maxEmployees) || 3 
    : 3;
  const currentUsedSlots = employees.length + invitations.length;
  const canInvite = currentUsedSlots < maxEmployees;

  const filteredEmployees = employees.filter(emp => 
    emp.user_id.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInvitations = invitations.filter(inv => 
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  if (role !== 'owner' && role !== 'super_admin') {
    return <div className="text-red-400 p-8">No tienes permisos para ver esto.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6" />
            Empleados
          </h2>
          <p className="text-slate-400">Gestión del equipo de trabajo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Card */}
        <Card className="lg:col-span-1">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Estado de Plantilla</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Activos</span>
                </div>
                <span className="text-white font-bold">{employees.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-slate-400 text-sm">Pendientes</span>
                </div>
                <span className="text-white font-bold">{invitations.length}</span>
              </div>
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-sm">Cupos</span>
                  <span className={`font-bold ${canInvite ? 'text-green-400' : 'text-amber-400'}`}>
                    {currentUsedSlots}/{maxEmployees}
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${currentUsedSlots >= maxEmployees ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min((currentUsedSlots / maxEmployees) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            {!canInvite && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-400">Has alcanzado el límite máximo de empleados.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Invite Form */}
        <Card className="lg:col-span-3">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            Invitar Nuevo Empleado
          </h3>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    required 
                    disabled={!canInvite || loading}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="empleado@empresa.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Permisos</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2.5 text-sm text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      disabled={!canInvite || loading}
                      checked={perms.can_create_inventory} 
                      onChange={(e) => setPerms({...perms, can_create_inventory: e.target.checked})} 
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500" 
                    />
                    <Shield className="w-4 h-4 text-slate-500" />
                    Inventario
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      disabled={!canInvite || loading}
                      checked={perms.can_view_reports} 
                      onChange={(e) => setPerms({...perms, can_view_reports: e.target.checked})} 
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500" 
                    />
                    <Shield className="w-4 h-4 text-slate-500" />
                    Reportes
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!canInvite || loading}
                className="px-6"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Invitación
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'employees' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Empleados ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'invitations' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Invitaciones ({invitations.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={`Buscar ${activeTab === 'employees' ? 'por ID...' : 'por email...'}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      <Card>
        {activeTab === 'employees' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Usuario ID</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Permisos</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay empleados activos</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.user_id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="text-white font-mono text-sm">{emp.user_id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries((emp.permissions as Record<string, any>) || {}).map(([key, val]) => val === true && (
                            <span key={key} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded-md border border-blue-500/20 font-medium">
                              {key.replace('can_', '')}
                            </span>
                          ))}
                          {Object.keys((emp.permissions as Record<string, any>) || {}).filter(k => (emp.permissions as any)[k]).length === 0 && (
                            <span className="text-slate-500 text-sm">Sin permisos</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full font-medium">
                          Activo
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Permisos</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay invitaciones enviadas</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map(inv => (
                    <tr key={inv.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-slate-500" />
                          </div>
                          <span className="text-white">{inv.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries((inv.permissions as Record<string, any>) || {}).map(([key, val]) => val === true && (
                            <span key={key} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded-md border border-amber-500/20 font-medium">
                              {key.replace('can_', '')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-sm">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-full font-medium">
                          Pendiente
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
