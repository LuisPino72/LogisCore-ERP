import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const VALID_TABLES = [
  'products',
  'categories',
  'sales',
  'customers',
  'invoices',
  'purchases',
  'recipes',
  'production_logs',
  'suppliers',
  'employees',
  'suspended_sales',
  'taxpayer_info',
  'invoice_settings',
  'settings'
] as const;

type ValidTable = typeof VALID_TABLES[number];

const TABLE_COLUMN_MAPPING: Record<string, string[]> = {
  products: ['name', 'sku', 'price', 'cost', 'stock', 'category_id', 'image_url', 'is_favorite', 'is_active', 'price_per_kg'],
  categories: ['name', 'description', 'sale_type'],
  sales: ['items', 'subtotal', 'tax', 'total', 'payment_method', 'status', 'exchange_rate', 'exchange_rate_source'],
  customers: ['nombre_razon_social', 'rif_cedula', 'direccion', 'telefono', 'email', 'notas', 'is_active'],
  invoices: [
    'invoice_number', 'control_number', 'tipo_documento', 'estatus',
    'emisor_rif', 'emisor_razon_social', 'emisor_direccion', 'emisor_numero_providencia',
    'customer_id', 'cliente_nombre', 'cliente_rif_cedula', 'cliente_direccion', 'cliente_telefono',
    'subtotal_usd', 'tasa_bcv', 'base_imponible_bs', 'monto_iva_bs', 'monto_exento_bs',
    'total_bs', 'aplica_igtf', 'monto_igtf_bs', 'total_final_bs', 'sale_id', 'created_by',
    'annulled_at', 'annulled_by', 'annulled_reason', 'hash_seguridad', 'items'
  ],
  purchases: ['supplier', 'invoice_number', 'items', 'subtotal', 'tax', 'total', 'status'],
  recipes: ['name', 'description', 'product_id', 'ingredients', 'yield', 'is_active'],
  production_logs: ['recipe_id', 'quantity', 'ingredients_used'],
  suppliers: ['name', 'contact_name', 'email', 'phone', 'address', 'notes', 'is_active'],
  employees: ['user_id', 'role', 'permissions'],
  suspended_sales: ['cart', 'note'],
  taxpayer_info: ['rif', 'razon_social', 'direccion_fiscal', 'numero_providencia', 'logo_url'],
  invoice_settings: ['sequential_type', 'last_invoice_date', 'last_invoice_number', 'last_control_prefix', 'igtf_enabled', 'igtf_percentage'],
  settings: ['key', 'value'],
};

Deno.serve(async (req: Request) => {
  try {
    const { p_table, p_operation, p_data, p_local_id, p_tenant_uuid, p_tenant_slug } = await req.json();

    // Validation
    if (!p_table || !p_operation || !p_data || !p_local_id || !p_tenant_uuid || !p_tenant_slug) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters', code: 'MISSING_PARAMS' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_TABLES.includes(p_table as ValidTable)) {
      return new Response(
        JSON.stringify({ error: `Invalid table: ${p_table}`, code: 'INVALID_TABLE' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['create', 'update', 'delete'].includes(p_operation)) {
      return new Response(
        JSON.stringify({ error: `Invalid operation: ${p_operation}`, code: 'INVALID_OPERATION' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = new SupabaseClient(supabaseUrl, serviceRoleKey);

    // Build data payload
    const allowedColumns = TABLE_COLUMN_MAPPING[p_table] || [];
    const payload: Record<string, unknown> = {
      local_id: p_local_id,
      tenant_id: p_tenant_uuid,
      tenant_slug: p_tenant_slug,
    };

    for (const key of allowedColumns) {
      if (p_data[key] !== undefined) {
        payload[key] = p_data[key];
      }
    }

    // Handle operations
    if (p_operation === 'delete') {
      const { error } = await adminClient
        .from(p_table)
        .delete()
        .eq('local_id', p_local_id)
        .eq('tenant_id', p_tenant_uuid);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message, code: 'DELETE_ERROR' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, local_id: p_local_id }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Upsert logic for create/update
    const { data: existing } = await adminClient
      .from(p_table)
      .select('id')
      .eq('local_id', p_local_id)
      .single();

    let result;

    if (existing) {
      // Update existing record
      if (p_operation === 'update') {
        const { data, error } = await adminClient
          .from(p_table)
          .update(payload)
          .eq('local_id', p_local_id)
          .select()
          .single();

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            return new Response(
              JSON.stringify({ error: 'Duplicate entry', code: 'DUPLICATE_ERROR' }),
              { status: 409, headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify({ error: error.message, code: 'UPDATE_ERROR' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }

        result = data;
      } else {
        // create but exists - return existing
        result = existing;
      }
    } else {
      // Insert new record
      const { data, error } = await adminClient
        .from(p_table)
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return new Response(
            JSON.stringify({ error: 'Duplicate entry', code: 'DUPLICATE_ERROR' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: error.message, code: 'INSERT_ERROR' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      result = data;
    }

    return new Response(
      JSON.stringify({ success: true, local_id: p_local_id, id: result?.id }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', code: 'UNKNOWN_ERROR' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
