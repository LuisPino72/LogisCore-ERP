import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useTenantStore } from '../store/useTenantStore'

interface Tenant {
  id: string
  name: string
  slug: string
  modules: any
  config: any
  created_at: string
}

export default function AdminPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)

  const startImpersonation = useTenantStore((state) => state.startImpersonation)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (data) setTenants(data)
  }

  const handleImpersonate = (tenant: Tenant) => {
    startImpersonation({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      modules: tenant.modules,
      config: tenant.config
    })
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('tenants').insert([
      { name, slug: slug.toLowerCase().replace(/\s+/g, '-') }
    ])
    if (error) alert('Error: ' + error.message)
    else { setName(''); setSlug(''); fetchTenants() }
    setLoading(false)
  }

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTenant) return
    setLoading(true)
    const { error } = await supabase.from('tenants').update({
      name: editingTenant.name,
      modules: editingTenant.modules,
      config: editingTenant.config
    }).eq('id', editingTenant.id)
    
    if (error) alert('Error: ' + error.message)
    else { alert('Guardado con éxito'); setEditingTenant(null); fetchTenants() }
    setLoading(false)
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingTenant || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    setLoading(true)
    
    const fileExt = file.name.split('.').pop()
    const fileName = `${editingTenant.id}-logo-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('tenant_assets')
      .upload(fileName, file, { upsert: true })
      
    if (uploadError) {
      alert('Error subiendo logo: ' + uploadError.message)
    } else {
      const { data } = supabase.storage.from('tenant_assets').getPublicUrl(fileName)
      setEditingTenant({
        ...editingTenant,
        config: { ...editingTenant.config, logoUrl: data.publicUrl }
      })
    }
    setLoading(false)
  }

  const handleInviteOwner = async (tenantId: string) => {
    if (!inviteEmail) return alert('Ingresa un correo')
    setInviteLoading(true)
    const { error } = await supabase.from('invitations').insert([{
      tenant_id: tenantId,
      email: inviteEmail,
      role: 'owner'
    }])
    if (error) alert('Error invitando (¿Usuario ya invitado?): ' + error.message)
    else { alert('Invitación creada para ' + inviteEmail); setInviteEmail('') }
    setInviteLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Formulario de Creación */}
      {!editingTenant ? (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4 text-blue-400">Registrar Nuevo Negocio</h3>
          <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombre Comercial</label>
              <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ej: Panadería Juan" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Slug (URL única)</label>
              <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" placeholder="ej-panaderia-juan" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary h-10">{loading ? 'Creando...' : 'Crear Empresa'}</button>
          </form>
        </section>
      ) : (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-amber-400">Editando: {editingTenant.name}</h3>
            <button type="button" onClick={() => setEditingTenant(null)} className="text-sm text-slate-400 hover:text-white">Cancelar</button>
          </div>
          
          <form onSubmit={handleUpdateTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nombre Comercial</label>
                <input type="text" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={editingTenant.name} onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Max Empleados (Config)</label>
                <input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white" value={editingTenant.config?.maxEmployees || 3} onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, maxEmployees: parseInt(e.target.value)}})} />
              </div>
              
              {/* Logo Upload */}
              <div>
                <label className="flex text-sm text-slate-400 mb-1 items-center justify-between">
                  Logotipo 
                  {editingTenant.config?.logoUrl && <a href={editingTenant.config.logoUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">Ver Actual</a>}
                </label>
                <input type="file" accept="image/*" onChange={handleUploadLogo} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600" />
              </div>

              {/* Tema / Color Base */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Color Principal (Hex)</label>
                <div className="flex gap-2">
                  <input type="color" value={editingTenant.config?.themeColor || '#3b82f6'} onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, themeColor: e.target.value}})} className="h-10 w-10 rounded border border-slate-700 bg-slate-800 cursor-pointer" />
                  <input type="text" value={editingTenant.config?.themeColor || '#3b82f6'} onChange={(e) => setEditingTenant({...editingTenant, config: {...editingTenant.config, themeColor: e.target.value}})} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Módulos Activos en el Tenant</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                {['sales', 'inventory', 'purchases', 'recipes'].map(mod => (
                  <label key={mod} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-blue-400 transition-colors">
                    <input type="checkbox" checked={!!editingTenant.modules?.[mod]} onChange={(e) => setEditingTenant({...editingTenant, modules: {...editingTenant.modules, [mod]: e.target.checked}})} className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 w-4 h-4" />
                    <span className="capitalize">{mod}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-4">{loading ? 'Guardando...' : 'Guardar Cambios y Cerrar Edición'}</button>
          </form>

          {/* Invitar Dueño */}
          <div className="pt-6 border-t border-slate-800">
            <h4 className="text-sm font-medium text-white mb-2">Invitar Dueño (Owner)</h4>
            <div className="flex gap-2">
              <input type="email" placeholder="correo@dueño.com" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <button disabled={inviteLoading} onClick={() => handleInviteOwner(editingTenant.id)} className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">Invitar</button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Solo puede registrarse un dueño por empresa. El usuario debe crear una cuenta usando el mismo correo para que el acceso se vincule automáticamente.</p>
          </div>
        </section>
      )}

      {/* Listado de Tenants */}
      {!editingTenant && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Nombre / Slug</th>
                <th className="px-6 py-4 font-medium">Módulos</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{t.name}</p>
                    <p className="text-slate-400 font-mono text-xs max-w-xs truncate">{t.slug}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(t.modules || {}).map(m => t.modules[m] && (
                        <span key={m} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded uppercase border border-blue-500/20">
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => handleImpersonate(t)} className="text-sm text-amber-500 hover:text-amber-400 hover:underline transition-colors font-medium">
                      Entrar
                    </button>
                    <button onClick={() => setEditingTenant(t)} className="text-sm text-blue-400 hover:text-white border border-slate-700 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">No hay negocios registrados actualmente.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  )
}
