import { supabase } from '@/lib/supabase'
import { Result, Ok, Err, AppError, ValidationError, UnauthorizedError } from '@/lib/types/result'
import { logger, logCategories } from '@/lib/logger'
import type { Tenant, TenantConfig, SystemMetrics, ActivityLog } from '../types/admin.types'

export async function verifySuperAdmin(): Promise<Result<void, AppError>> {
  try {
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
      logger.warn('verifySuperAdmin: No super_admin role', { userId: session.user.id, category: logCategories.AUTH })
      return Err(new UnauthorizedError('No tienes permisos de super_admin'))
    }

    return Ok(undefined)
  } catch (error) {
    logger.error('verifySuperAdmin: Unexpected error', error instanceof Error ? error : undefined, { category: logCategories.AUTH })
    return Err(new AppError('Error al verificar permisos', 'VERIFY_ADMIN_ERROR', 500))
  }
}

export async function getAllTenants(): Promise<Result<Tenant[], AppError>> {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('getAllTenants: Error fetching tenants', error instanceof Error ? error : undefined, { category: logCategories.DATABASE })
      return Err(new AppError('Error al obtener tenants', 'FETCH_TENANTS_ERROR', 500, { detail: error.message }))
    }

    logger.info('getAllTenants: Success', { count: data?.length || 0, category: logCategories.DATABASE })
    return Ok(data || [])
  } catch (error) {
    logger.error('getAllTenants: Unexpected error', error instanceof Error ? error : undefined, { category: logCategories.DATABASE })
    return Err(new AppError('Error al obtener tenants', 'FETCH_TENANTS_ERROR', 500))
  }
}

export async function getTenantById(id: string): Promise<Result<Tenant, AppError>> {
  try {
    if (!id?.trim()) {
      return Err(new ValidationError('El ID del tenant es requerido'))
    }

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      logger.error('getTenantById: Error fetching tenant', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
      return Err(new AppError('Tenant no encontrado', 'TENANT_NOT_FOUND', 404, { detail: error.message }))
    }

    return Ok(data)
  } catch (error) {
    logger.error('getTenantById: Unexpected error', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
    return Err(new AppError('Error al obtener tenant', 'GET_TENANT_ERROR', 500))
  }
}

export async function createTenant(name: string, slug: string): Promise<Result<Tenant, AppError>> {
  try {
    if (!name?.trim()) {
      return Err(new ValidationError('El nombre es requerido'))
    }

    if (!slug?.trim()) {
      return Err(new ValidationError('El slug es requerido'))
    }

    const normalizedSlug = slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    if (normalizedSlug.length < 2) {
      return Err(new ValidationError('El slug debe tener al menos 2 caracteres'))
    }

    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', normalizedSlug)
      .single()

    if (existing) {
      logger.warn('createTenant: Duplicate slug', { slug: normalizedSlug, category: logCategories.DATABASE })
      return Err(new ValidationError('Ya existe un tenant con ese slug'))
    }

    const { data, error } = await supabase
      .from('tenants')
      .insert([{ name, slug: normalizedSlug }])
      .select()
      .single()

    if (error) {
      logger.error('createTenant: Error creating tenant', error instanceof Error ? error : undefined, { name, slug: normalizedSlug, category: logCategories.DATABASE })
      return Err(new AppError('Error al crear tenant', 'CREATE_TENANT_ERROR', 500, { detail: error.message }))
    }

    logger.info('createTenant: Success', { tenantId: data.id, name, slug: normalizedSlug, category: logCategories.DATABASE })
    return Ok(data)
  } catch (error) {
    logger.error('createTenant: Unexpected error', error instanceof Error ? error : undefined, { name, slug, category: logCategories.DATABASE })
    return Err(new AppError('Error al crear tenant', 'CREATE_TENANT_ERROR', 500))
  }
}

export async function updateTenant(
  id: string,
  data: Partial<Tenant>
): Promise<Result<Tenant, AppError>> {
  try {
    if (!id?.trim()) {
      return Err(new ValidationError('El ID del tenant es requerido'))
    }

    const updateData: Partial<Tenant> = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.modules !== undefined) updateData.modules = data.modules
    if (data.config !== undefined) updateData.config = data.config

    if (Object.keys(updateData).length === 0) {
      return Err(new ValidationError('No hay datos para actualizar'))
    }

    const { data: updated, error } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('updateTenant: Error updating tenant', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
      return Err(new AppError('Error al actualizar tenant', 'UPDATE_TENANT_ERROR', 500, { detail: error.message }))
    }

    logger.info('updateTenant: Success', { tenantId: id, category: logCategories.DATABASE })
    return Ok(updated)
  } catch (error) {
    logger.error('updateTenant: Unexpected error', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
    return Err(new AppError('Error al actualizar tenant', 'UPDATE_TENANT_ERROR', 500))
  }
}

export async function deleteTenant(id: string): Promise<Result<void, AppError>> {
  try {
    if (!id?.trim()) {
      return Err(new ValidationError('El ID del tenant es requerido'))
    }

    const authCheck = await verifySuperAdmin()
    if (!authCheck.ok) {
      return Err(authCheck.error)
    }

    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('deleteTenant: Error deleting tenant', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
      return Err(new AppError('Error al eliminar tenant', 'DELETE_TENANT_ERROR', 500, { detail: error.message }))
    }

    logger.info('deleteTenant: Success', { tenantId: id, category: logCategories.DATABASE })
    return Ok(undefined)
  } catch (error) {
    logger.error('deleteTenant: Unexpected error', error instanceof Error ? error : undefined, { tenantId: id, category: logCategories.DATABASE })
    return Err(new AppError('Error al eliminar tenant', 'DELETE_TENANT_ERROR', 500))
  }
}

export async function uploadLogo(tenantId: string, file: File): Promise<Result<string, AppError>> {
  try {
    if (!tenantId?.trim()) {
      return Err(new ValidationError('El ID del tenant es requerido'))
    }

    if (!file) {
      return Err(new ValidationError('El archivo es requerido'))
    }

    if (!file.type.startsWith('image/')) {
      return Err(new ValidationError('El archivo debe ser una imagen'))
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return Err(new ValidationError('Solo se permiten imágenes JPG, PNG o WebP'))
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return Err(new ValidationError('El archivo debe ser menor a 5MB'))
    }

    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${tenantId}-logo-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('tenant_assets')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      logger.error('uploadLogo: Error uploading file', uploadError instanceof Error ? uploadError : undefined, { tenantId, category: logCategories.DATABASE })
      return Err(new AppError('Error al subir logo', 'UPLOAD_LOGO_ERROR', 500, { detail: uploadError.message }))
    }

    const { data } = supabase.storage.from('tenant_assets').getPublicUrl(fileName)
    
    logger.info('uploadLogo: Success', { tenantId, fileName, category: logCategories.DATABASE })
    return Ok(data.publicUrl)
  } catch (error) {
    logger.error('uploadLogo: Unexpected error', error instanceof Error ? error : undefined, { tenantId, category: logCategories.DATABASE })
    return Err(new AppError('Error al subir logo', 'UPLOAD_LOGO_ERROR', 500))
  }
}

export async function createOwner(
  tenantId: string,
  email: string,
  password: string
): Promise<Result<void, AppError>> {
  try {
    if (!tenantId?.trim()) {
      return Err(new ValidationError('El ID del tenant es requerido'))
    }

    if (!email?.trim()) {
      return Err(new ValidationError('El email es requerido'))
    }

    if (!password || password.length < 6) {
      return Err(new ValidationError('La contraseña debe tener al menos 6 caracteres'))
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Err(new ValidationError('El formato del email no es válido'))
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
      },
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
        logger.warn('createOwner: Email already registered', { email, tenantId, category: logCategories.AUTH })
        return Err(new ValidationError('Ya existe un usuario con ese email'))
      }
      logger.error('createOwner: Auth error', authError instanceof Error ? authError : undefined, { email, tenantId, category: logCategories.AUTH })
      return Err(new AppError('Error al crear usuario', 'CREATE_USER_ERROR', 500, { detail: authError.message }))
    }

    if (!authData.user) {
      logger.error('createOwner: No user returned', undefined, { email, tenantId, category: logCategories.AUTH })
      return Err(new AppError('Error al crear usuario', 'CREATE_USER_ERROR', 500))
    }

    const { error: roleError } = await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      tenant_id: tenantId,
      role: 'owner',
    })

    if (roleError) {
      logger.error('createOwner: Role assignment error', roleError instanceof Error ? roleError : undefined, { userId: authData.user.id, tenantId, category: logCategories.DATABASE })
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
      logger.error('createOwner: Tenant update error', updateError instanceof Error ? updateError : undefined, { userId: authData.user.id, tenantId, category: logCategories.DATABASE })
      return Err(new AppError('Error al actualizar tenant', 'UPDATE_TENANT_ERROR', 500, { detail: updateError.message }))
    }

    logger.info('createOwner: Success', { userId: authData.user.id, email, tenantId, category: logCategories.AUTH })
    return Ok(undefined)
  } catch (error) {
    logger.error('createOwner: Unexpected error', error instanceof Error ? error : undefined, { email, tenantId, category: logCategories.AUTH })
    return Err(new AppError('Error al crear usuario', 'CREATE_USER_ERROR', 500))
  }
}

export async function getSystemMetrics(): Promise<Result<SystemMetrics, AppError>> {
  try {
    const tenantsResult = await getAllTenants()
    if (!tenantsResult.ok) {
      return Err(tenantsResult.error)
    }

    const tenants = tenantsResult.value
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, tenant_id, tenants!inner(name)')

    if (rolesError) {
      logger.error('getSystemMetrics: Error fetching roles', rolesError instanceof Error ? rolesError : undefined, { category: logCategories.DATABASE })
      return Err(new AppError('Error al obtener métricas', 'METRICS_ERROR', 500, { detail: rolesError.message }))
    }

    const uniqueUsers = new Set(userRoles?.map(r => r.user_id) || [])
    const activeTenants = tenants.filter(t => t.config?.ownerId).length

    const activityLogs: ActivityLog[] = []

    logger.info('getSystemMetrics: Success', { 
      totalTenants: tenants.length, 
      activeTenants, 
      totalUsers: uniqueUsers.size,
      category: logCategories.DATABASE 
    })

    return Ok({
      totalTenants: tenants.length,
      activeTenants,
      totalUsers: uniqueUsers.size,
      recentActivity: activityLogs,
    })
  } catch (error) {
    logger.error('getSystemMetrics: Unexpected error', error instanceof Error ? error : undefined, { category: logCategories.DATABASE })
    return Err(new AppError('Error al obtener métricas', 'METRICS_ERROR', 500))
  }
}
