import { useState, useEffect, useCallback } from 'react';
import { useTenantStore } from '@/store/useTenantStore';
import { useToast } from '@/providers/ToastProvider';
import * as movementsService from '../services/movements.service';
import type { Movement, MovementType, MovementCategory, MovementPaymentMethod } from '@/lib/db';

interface MovementStats {
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netBalance: number;
  byCategory: Record<MovementCategory, number>;
  byPaymentMethod: Record<string, number>;
}

export type AccountingTab = 'movements' | 'reports' | 'balance';

export interface MovementFilters {
  type: MovementType | 'all';
  category: MovementCategory | 'all';
  dateRange: { start: Date | null; end: Date | null };
  search: string;
}

export function useAccounting() {
  const { currentTenant } = useTenantStore();
  const { showError, showSuccess } = useToast();
  
  const [activeTab, setActiveTab] = useState<AccountingTab>('movements');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState<MovementStats | null>(null);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<MovementFilters>({
    type: 'all',
    category: 'all',
    dateRange: { start: null, end: null },
    search: '',
  });

  const loadMovements = useCallback(async () => {
    if (!currentTenant?.slug) return;
    setLoading(true);
    try {
      const data = await movementsService.getMovements();
      setMovements(data);
    } catch {
      showError('Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.slug, showError]);

  const loadStats = useCallback(async () => {
    if (!currentTenant?.slug) return;
    try {
      const data = await movementsService.getMovementStats();
      setStats(data);
    } catch {
      console.error('Error loading stats:', 'Failed to load movement stats');
    }
  }, [currentTenant?.slug]);

  const loadCashBalance = useCallback(async () => {
    if (!currentTenant?.slug) return;
    try {
      const balance = await movementsService.getCashBalance();
      setCashBalance(balance);
    } catch (error) {
      console.error('Error loading cash balance:', error);
    }
  }, [currentTenant?.slug]);

  useEffect(() => {
    loadMovements();
    loadStats();
    loadCashBalance();
  }, [loadMovements, loadStats, loadCashBalance]);

  const createMovement = useCallback(async (data: {
    type: MovementType;
    category: MovementCategory;
    amount: number;
    currency?: string;
    paymentMethod?: MovementPaymentMethod;
    description?: string;
  }) => {
    setLoading(true);
    try {
      const result = await movementsService.createMovement(data);
      if (result.ok) {
        showSuccess('Movimiento creado exitosamente');
        await loadMovements();
        await loadStats();
        await loadCashBalance();
        return result.value;
      } else {
        showError(result.error.message);
        return null;
      }
    } catch {
      showError('Error al crear movimiento');
      return null;
    } finally {
      setLoading(false);
    }
  }, [showError, showSuccess, loadMovements, loadStats, loadCashBalance]);

  const getFilteredMovements = useCallback(() => {
    let filtered = [...movements];
    
    if (filters.type !== 'all') {
      filtered = filtered.filter(m => m.type === filters.type);
    }
    
    if (filters.category !== 'all') {
      filtered = filtered.filter(m => m.category === filters.category);
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(m => 
        m.description?.toLowerCase().includes(searchLower) ||
        m.category.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.dateRange.start) {
      filtered = filtered.filter(m => m.createdAt >= filters.dateRange.start!);
    }
    
    if (filters.dateRange.end) {
      filtered = filtered.filter(m => m.createdAt <= filters.dateRange.end!);
    }
    
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [movements, filters]);

  const getCategorySummary = useCallback(() => {
    if (!stats) return [];
    
    const categories = Object.entries(stats.byCategory)
      .filter(([_, value]) => value > 0)
      .map(([category, amount]) => ({
        category: category as MovementCategory,
        amount,
        type: movements.some(m => m.category === category && m.type === 'income') 
          ? 'income' 
          : 'expense',
      }))
      .sort((a, b) => b.amount - a.amount);
    
    return categories;
  }, [stats, movements]);

  return {
    activeTab,
    setActiveTab,
    movements,
    stats,
    cashBalance,
    loading,
    filters,
    setFilters,
    createMovement,
    getFilteredMovements,
    getCategorySummary,
    reload: loadMovements,
  };
}