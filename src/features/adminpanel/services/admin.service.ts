import { supabase } from '@/lib/supabase'
import { Result, Ok, Err, AppError, ValidationError, UnauthorizedError } from '@/lib/types/result'
import type { Tenant, TenantConfig } from '../types/admin.types'

export async function verifySuperAdmin(): Promise<Result<void, AppError>> {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.user) {
    return Err(new UnauthorizedError('No hay sesión activa'))
  }

  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id)
    .eq('role', 'super_admin')
    .single()

  if (error || !roles) {
    return Err(new UnauthorizedError('No tienes permisos de super_admin'))
  }

  return Ok(undefined)
}

export async function getAllTenants(): Promise<Result<Tenant[], AppError>> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return Err(new AppError('Error al obtener tenants', 'FETCH_TENANTS_ERROR', 500, { detail: error.message }))
  }

  return Ok(data || [])
}

export async function getTenantById(id: string): Promise<Result<Tenant, AppError>> {
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return Err(new AppError('Tenant no encontrado', 'TENANT_NOT_FOUND', 404, { detail: error.message }))
  }

  return Ok(data)
}

export async function createTenant(name: string, slug: string): Promise<Result<Tenant, AppError>> {
  if (!name.trim()) {
    return Err(new ValidationError('El nombre es requerido'))
  }

  if (!slug.trim()) {
    return Err(new ValidationError('El slug es requerido'))
  }

  const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', normalizedSlug)
    .single()

  if (existing) {
    return Err(new ValidationError('Ya existe un tenant con ese slug'))
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert([{ name, slug: normalizedSlug }])
    .select()
    .single()

  if (error) {
    return Err(new AppError('Error al crear tenant', 'CREATE_TENANT_ERROR', 500, { detail: error.message }))
  }

  return Ok(data)
}

export async function updateTenant(
  id: string,
  data: Partial<Tenant>
): Promise<Result<Tenant, AppError>> {
  const updateData: Partial<Tenant> = {}
  
  if (data.name !== undefined) updateData.name = data.name
  if (data.modules !== undefined) updateData.modules = data.modules
  if (data.config !== undefined) updateData.config = data.config

  const { data: updated, error } = await supabase
    .from('tenants')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return Err(new AppError('Error al actualizar tenant', 'UPDATE_TENANT_ERROR', 500, { detail: error.message }))
  }

  return Ok(updated)
}

export async function deleteTenant(id: string): Promise<Result<void, AppError>> {
  const authCheck = await verifySuperAdmin()
  if (!authCheck.ok) {
    return Err(authCheck.error)
  }

  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)

  if (error) {
    return Err(new AppError('Error al eliminar tenant', 'DELETE_TENANT_ERROR', 500, { detail: error.message }))
  }

  return Ok(undefined)
}

export async function uploadLogo(tenantId: string, file: File): Promise<Result<string, AppError>> {
  if (!file.type.startsWith('image/')) {
    return Err(new ValidationError('El archivo debe ser una imagen'))
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return Err(new ValidationError('Solo se permiten imágenes JPG, PNG o WebP'))
  }

  const fileExt = file.name.split('.').pop()
  const fileName = `${tenantId}-logo-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('tenant_assets')
    .upload(fileName, file, { upsert: true })

  if (uploadError) {
    return Err(new AppError('Error al subir logo', 'UPLOAD_LOGO_ERROR', 500, { detail: uploadError.message }))
  }

  const { data } = supabase.storage.from('tenant_assets').getPublicUrl(fileName)
  
  return Ok(data.publicUrl)
}

export async function createOwner(
  tenantId: string,
  email: string,
  password: string
): Promise<Result<void, AppError>> {
  if (!email.trim()) {
    return Err(new ValidationError('El email es requerido'))
  }

  if (!password || password.length < 6) {
    return Err(new ValidationError('La contraseña debe tener al menos 6 caracteres'))
  }

  const tempClient = (await import('@supabase/supabase-js')).createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      },
    }
  )

  const { data: authData, error: authError } = await tempClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: email,
        tenant_id: tenantId,
      },
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return Err(new ValidationError('Ya existe un usuario con ese email'))
    }
    return Err(new AppError('Error al crear usuario', 'CREATE_USER_ERROR', 500, { detail: authError.message }))
  }

  if (!authData.user) {
    return Err(new AppError('Error al crear usuario', 'CREATE_USER_ERROR', 500))
  }

  const { error: roleError } = await supabase.from('user_roles').insert({
    user_id: authData.user.id,
    tenant_id: tenantId,
    role: 'owner',
  })

  if (roleError) {
    return Err(new AppError('Error al asignar rol', 'ASSIGN_ROLE_ERROR', 500, { detail: roleError.message }))
  }

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('config')
    .eq('id', tenantId)
    .single()

  const currentConfig = (tenantData?.config as TenantConfig) || {}
  const newConfig = { ...currentConfig, ownerId: authData.user.id }

  const { error: updateError } = await supabase
    .from('tenants')
    .update({ config: newConfig })
    .eq('id', tenantId)

  if (updateError) {
    return Err(new AppError('Error al actualizar tenant', 'UPDATE_TENANT_ERROR', 500, { detail: updateError.message }))
  }

  return Ok(undefined)
}