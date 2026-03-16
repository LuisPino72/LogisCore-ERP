import { useState, useEffect, useCallback } from "react";
import { useTenantStore } from "../../../store/useTenantStore";
import { getEmployees } from "../services/employees.service";
import { Employee } from "../../../lib/db";
import { isOk } from "../../../types/result";
import { useToast } from "../../../providers/ToastProvider";
import Card from "../../../common/Card";    
import {
  Users,
  Search,
  UserCheck,
} from "lucide-react";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const tenant = useTenantStore((state) => state.currentTenant);
  const role = useTenantStore((state) => state.role);
  const { showError } = useToast();

  const fetchData = useCallback(async () => {
    if (!tenant) return;

    const empResult = await getEmployees();
    if (isOk(empResult)) {
      setEmployees(empResult.value);
    } else {
      showError(empResult.error.message);
    }
  }, [tenant, showError]);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant, fetchData]);

  const filteredEmployees = employees.filter((emp) =>
    emp.userId.toLowerCase().includes(search.toLowerCase()),
  );

  if (role !== "owner" && role !== "super_admin") {
    return (
      <div className="text-red-400 p-8">No tienes permisos para ver esto.</div>
    );
  }

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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-(--border-color)">
                <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                  Usuario ID
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                  Permisos
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-(--text-muted) uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-12 text-center text-(--text-muted)">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay empleados activos</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.userId}
                    className="border-b border-(--border-color)/50 hover:bg-(--bg-tertiary)">
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
                        {Object.entries(
                          (emp.permissions as Record<string, any>) || {},
                        ).map(
                          ([key, val]) =>
                            val === true && (
                              <span
                                key={key}
                                className="px-2 py-0.5 bg-(--brand-500)/10 text-(--brand-400) text-[10px] rounded-md border border-(--brand-500)/20 font-medium">
                                {key.replace("can_", "")}
                              </span>
                            ),
                        )}
                        {Object.keys(
                          (emp.permissions as Record<string, any>) || {},
                        ).filter((k) => (emp.permissions as any)[k])
                          .length === 0 && (
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
