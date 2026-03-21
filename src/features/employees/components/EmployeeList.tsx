import { Users, Loader2 } from 'lucide-react'
import Card from '@/common/Card'
import EmployeeCard from './EmployeeCard'
import type { Employee } from '@/lib/db'

interface EmployeeListProps {
  employees: Employee[]
  isLoading: boolean
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

export default function EmployeeList({ employees, isLoading, onEdit, onDelete }: EmployeeListProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-(--brand-400) animate-spin" />
        </div>
      </Card>
    )
  }

  if (employees.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center py-12 text-(--text-muted)">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No hay empleados registrados</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.localId}
            employee={employee}
            onEdit={() => onEdit(employee)}
            onDelete={() => onDelete(employee)}
          />
        ))}
      </div>
    </Card>
  )
}
