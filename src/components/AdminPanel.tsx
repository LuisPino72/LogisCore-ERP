import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

interface Tenant {
  id: string
  name: string
  slug: string
  modules: any
  created_at: string
}

/**
 * Componente de Gestión de Tenants para el Super Admin.
 * Permite listar y crear nuevos negocios (Fase 2).
 */
export default function AdminPanel() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)

  // Cargar lista de tenants al montar el componente
  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false })
    if (data) setTenants(data)
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Insertar nuevo tenant en la tabla pública
    // El trigger en la base de datos creará el esquema automáticamente
    const { error } = await supabase.from('tenants').insert([
      { name, slug: slug.toLowerCase().replace(/\s+/g, '-') }
    ])

    if (error) {
      alert('Error al crear tenant: ' + error.message)
    } else {
      setName('')
      setSlug('')
      fetchTenants()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Formulario de Creación */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-4 text-blue-400">Registrar Nuevo Negocio</h3>
        <form onSubmit={handleCreateTenant} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nombre Comercial</label>
            <input
              type="text"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Ej: Panadería Juan"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Slug (URL única)</label>
            <input
              type="text"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="ej-panaderia-juan"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary h-10"
          >
            {loading ? 'Creando...' : 'Crear Empresa'}
          </button>
        </form>
      </section>

      {/* Listado de Tenants */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800/50 text-slate-400 text-sm uppercase">
            <tr>
              <th className="px-6 py-4 font-medium">Nombre</th>
              <th className="px-6 py-4 font-medium">Slug / ID</th>
              <th className="px-6 py-4 font-medium">Módulos</th>
              <th className="px-6 py-4 font-medium text-right">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{t.name}</td>
                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{t.slug}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    {Object.keys(t.modules || {}).map(m => t.modules[m] && (
                      <span key={m} className="px-2 py-0.5 bg-blue-900/30 text-blue-400 text-[10px] rounded uppercase border border-blue-500/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm text-right">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                  No hay negocios registrados actualmente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
