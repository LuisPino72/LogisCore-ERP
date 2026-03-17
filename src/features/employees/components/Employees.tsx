import { useState, useEffect, useCallback } from "react";
import { useTenantStore } from "../../../store/useTenantStore";
import { getEmployees, createEmployee, updateEmployeePermissions, deleteEmployee, EmployeePermissions, DEFAULT_EMPLOYEE_PERMISSIONS } from "../services/employees.service";
import { Employee } from "../../../lib/db";
import { isOk } from "@/lib/types/result";
import { useToast } from "../../../providers/ToastProvider";
import Card from "../../../common/Card";    
import Button from "../../../common/Button";
import {
  Users,
  Search,
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
} from "lucide-react";

const PERMISSION_LABELS: Record<keyof EmployeePermissions, string> = {
  can_view_inventory: "Ver Inventario",
  can_create_product: "Crear Productos",
  can_edit_product: "Editar Productos",
  can_delete_product: "Eliminar Productos",
  can_manage_categories: "Gestionar Categorías",
  can_view_sales: "Ver Ventas",
  can_cancel_sales: "Cancelar Ventas",
  can_access_pos: "Acceder POS",
  can_view_recipes: "Ver Recetas",
  can_create_recipe: "Crear Recetas",
  can_produce: "Registrar Producción",
};

interface EmployeeModalProps {
  employee?: Employee;
  isOpen: boolean;
  onClose: () => void;
  onSave: (email: string, password: string, permissions: EmployeePermissions) => Promise<void>;
  isEditing: boolean;
}

function EmployeeModal({ employee, isOpen, onClose, onSave, isEditing }: EmployeeModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (employee && isEditing) {
      setPermissions(employee.permissions as EmployeePermissions || DEFAULT_EMPLOYEE_PERMISSIONS);
    } else {
      setPermissions(DEFAULT_EMPLOYEE_PERMISSIONS);
    }
    setEmail("");
    setPassword("");
  }, [employee, isEditing, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(email, password, permissions);
      showSuccess(isEditing ? "Permisos actualizados" : "Empleado creado");
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = useCallback((key: keyof EmployeePermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-(--bg-secondary) rounded-xl border border-(--border-color) w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-(--border-color)">
          <h3 className="text-lg font-semibold text-(--text-primary)">
            {isEditing ? "Editar Permisos" : "Nuevo Empleado"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-(--bg-tertiary) rounded-lg">
            <X className="w-5 h-5 text-(--text-muted)" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!isEditing && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">
                  Contraseña Temporal
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-(--text-secondary) mb-3">
              Permisos
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(PERMISSION_LABELS) as Array<keyof EmployeePermissions>).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-3 bg-(--bg-tertiary) rounded-lg cursor-pointer hover:bg-(--bg-elevated) transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={permissions[key] || false}
                    onChange={() => togglePermission(key)}
                    className="w-4 h-4 rounded border-(--border-color) text-(--brand-500) focus:ring-(--brand-500)"
                  />
                  <span className="text-sm text-(--text-primary)">
                    {PERMISSION_LABELS[key]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-(--border-color)">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                "Guardar Cambios"
              ) : (
                "Crear Empleado"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  const fetchData = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);

    const empResult = await getEmployees();
    if (isOk(empResult)) {
      setEmployees(empResult.value);
    } else {
      showError(empResult.error.message);
    }
    setLoading(false);
  }, [tenant, showError]);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant, fetchData]);

  const handleCreateEmployee = async (email: string, password: string, permissions: EmployeePermissions) => {
    const result = await createEmployee(email, password, permissions);
    if (!isOk(result)) {
      throw new Error(result.error.message);
    }
    await fetchData();
  };

  const handleUpdatePermissions = async (_email: string, _password: string, permissions: EmployeePermissions) => {
    if (!editingEmployee) return;
    const result = await updateEmployeePermissions(editingEmployee.localId, permissions);
    if (!isOk(result)) {
      throw new Error(result.error.message);
    }
    await fetchData();
  };

  const handleDeleteEmployee = async (localId: string) => {
    if (!confirm("¿Estás seguro de eliminar este empleado?")) return;
    
    const result = await deleteEmployee(localId);
    if (isOk(result)) {
      showSuccess("Empleado eliminado");
      await fetchData();
    } else {
      showError(result.error.message);
    }
  };

  const openEditModal = useCallback((employee: Employee) => {
    setEditingEmployee(employee);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEmployee(undefined);
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    emp.userId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-(--text-primary) flex items-center gap-2">
            <Users className="w-6 h-6" />
            Empleados
          </h2>
          <p className="text-(--text-secondary)">
            Gestión del equipo de trabajo
          </p>
        </div>
        <Button onClick={() => { setEditingEmployee(undefined); setModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Empleado
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) placeholder-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--brand-500)"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-(--brand-500)" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-(--border-color)">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                    Usuario
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                    Permisos
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                    Estado
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-(--text-muted)">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay empleados activos</p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr
                      key={emp.localId}
                      className="border-b border-(--border-color)/50 hover:bg-(--bg-tertiary)"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-(--bg-tertiary) rounded-lg flex items-center justify-center border border-(--border-color)">
                            <UserCheck className="w-5 h-5 text-(--text-muted)" />
                          </div>
                          <span className="text-(--text-primary) font-mono text-sm">
                            {emp.userId.slice(0, 8)}...
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(emp.permissions || {}).map(
                            ([key, val]) =>
                              val === true && (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 bg-(--brand-500)/10 text-(--brand-400) text-[10px] rounded-md border border-(--brand-500)/20 font-medium"
                                >
                                  {key.replace("can_", "")}
                                </span>
                              )
                          )}
                          {Object.keys(emp.permissions || {}).filter(
                            (k) => (emp.permissions as any)[k]
                          ).length === 0 && (
                            <span className="text-slate-500 text-sm">
                              Sin permisos
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-full font-medium">
                          Activo
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(emp)}
                            className="p-2 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-(--brand-400)"
                            title="Editar permisos"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.localId)}
                            className="p-2 hover:bg-(--bg-tertiary) rounded-lg text-(--text-muted) hover:text-red-400"
                            title="Eliminar empleado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <EmployeeModal
        isOpen={modalOpen}
        onClose={closeModal}
        employee={editingEmployee}
        onSave={editingEmployee ? handleUpdatePermissions : handleCreateEmployee}
        isEditing={!!editingEmployee}
      />
    </div>
  );
}
