import { supabase } from '@/lib/supabase';
import { useTenantStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError } from '@/lib/types/result';

export async function uploadProductImage(
  file: File,
  productLocalId: string
): Promise<Result<string, AppError>> {
  try {
    const tenant = useTenantStore.getState().currentTenant;
    if (!tenant) {
      return Err(new AppError('No hay tenant activo', 'NO_TENANT', 400));
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${tenant.id}/${productLocalId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      return Err(new AppError(`Error al subir imagen: ${uploadError.message}`, 'UPLOAD_ERROR', 500));
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    
    return Ok(data.publicUrl);
  } catch (error) {
    if (error instanceof AppError) {
      return Err(error);
    }
    return Err(new AppError('Error al subir imagen', 'UPLOAD_ERROR', 500));
  }
}

export function getProductImageUrl(imagePath: string): string {
  const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath);
  return data.publicUrl;
}
