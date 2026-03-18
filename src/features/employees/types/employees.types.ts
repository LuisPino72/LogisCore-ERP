export interface EmployeePermissions {
  can_view_inventory?: boolean;
  can_create_product?: boolean;
  can_edit_product?: boolean;
  can_delete_product?: boolean;
  can_manage_categories?: boolean;
  can_view_sales?: boolean;
  can_cancel_sales?: boolean;
  can_access_pos?: boolean;
  can_view_recipes?: boolean;
  can_create_recipe?: boolean;
  can_produce?: boolean;
  [key: string]: boolean | undefined;
}

export const DEFAULT_EMPLOYEE_PERMISSIONS: EmployeePermissions = {
  can_view_inventory: false,
  can_create_product: false,
  can_edit_product: false,
  can_delete_product: false,
  can_manage_categories: false,
  can_view_sales: false,
  can_cancel_sales: false,
  can_access_pos: false,
  can_view_recipes: false,
  can_create_recipe: false,
  can_produce: false,
};

export const PERMISSION_LABELS: Record<keyof EmployeePermissions, string> = {
  can_view_inventory: 'Ver Inventario',
  can_create_product: 'Crear Productos',
  can_edit_product: 'Editar Productos',
  can_delete_product: 'Eliminar Productos',
  can_manage_categories: 'Gestionar Categorías',
  can_view_sales: 'Ver Ventas',
  can_cancel_sales: 'Cancelar Ventas',
  can_access_pos: 'Acceder POS',
  can_view_recipes: 'Ver Recetas',
  can_create_recipe: 'Crear Recetas',
  can_produce: 'Registrar Producción',
};

export type SortField = 'userId' | 'role' | 'createdAt'
export type SortDirection = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  direction: SortDirection
}