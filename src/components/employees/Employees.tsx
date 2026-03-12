import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useTenantStore } from '../../store/useTenantStore';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
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
    
    // Fetch Employees (from user_roles where tenant matches and role is employee)
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role, permissions')
      .eq('tenant_id', tenant.id)
      .eq('role', 'employee');
      
    // En el futuro habría que hacer join a los perfiles de Auth para ver el email del usuario.
    // Por ahora mostramos los IDs o un placeholder si Supabase Auth admin API no está expuesta a este nivel.
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

  const maxEmployees = tenant?.config?.maxEmployees || 3;
  const currentUsedSlots = employees.length + invitations.length;
  const canInvite = currentUsedSlots < maxEmployees;

  if (role !== 'owner' && role !== 'super_admin') {
    return <div className="text-red-400 p-8">No tienes permisos para ver esto.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estadísticas / Límite */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Estado de la Plantilla</h2>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Empleados Activos</span>
              <span className="text-white font-medium">{employees.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Invitaciones Pendientes</span>
              <span className="text-white font-medium">{invitations.length}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-sm text-slate-400">Cupos Totales</span>
              <span className={`text-lg font-bold ${canInvite ? 'text-green-400' : 'text-amber-400'}`}>
                {currentUsedSlots} / {maxEmployees}
              </span>
            </div>
          </div>
          {!canInvite && (
            <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-3">
              <p className="text-xs text-amber-500">
                Has alcanzado el límite máximo de empleados. Contacta al soporte para ampliar tu plan.
              </p>
            </div>
          )}
        </div>

        {/* Formulario de Invitación */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">Invitar Nuevo Empleado</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required 
                  disabled={!canInvite || loading}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Permisos Básicos</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      disabled={!canInvite || loading}
                      checked={perms.can_create_inventory} 
                      onChange={(e) => setPerms({...perms, can_create_inventory: e.target.checked})} 
                      className="bg-slate-800 border-slate-700 rounded text-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    Puede Modificar Inventario
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input 
                      type="checkbox" 
                      disabled={!canInvite || loading}
                      checked={perms.can_view_reports} 
                      onChange={(e) => setPerms({...perms, can_view_reports: e.target.checked})} 
                      className="bg-slate-800 border-slate-700 rounded text-blue-500 w-4 h-4 cursor-pointer" 
                    />
                    Puede Ver Reportes
                  </label>
                </div>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={!canInvite || loading} 
              className="btn-primary w-full sm:w-auto h-10 px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Crear Invitación'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Empleados Activos */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-4">Empleados Activos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-slate-400 text-sm border-b border-slate-800">
                <tr>
                  <th className="pb-2">Usuario ID</th>
                  <th className="pb-2">Permisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {employees.map(emp => (
                  <tr key={emp.user_id}>
                    <td className="py-3 text-white text-sm font-mono truncate max-w-[150px]">{emp.user_id}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries((emp.permissions as Record<string, any>) || {}).map(([key, val]) => val === true && (
                          <span key={key} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded border border-blue-500/20">
                            {key.replace('can_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-slate-500 italic">No hay empleados activos todavía.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invitaciones Pendientes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl overflow-hidden">
          <h3 className="text-lg font-semibold text-white mb-4">Invitaciones Pendientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-slate-400 text-sm border-b border-slate-800">
                <tr>
                  <th className="pb-2">Email</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {invitations.map(inv => (
                  <tr key={inv.id}>
                    <td className="py-3 text-white text-sm">{inv.email}</td>
                    <td className="py-3 text-slate-400 text-sm">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr><td colSpan={2} className="py-8 text-center text-slate-500 italic">No hay invitaciones enviadas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
