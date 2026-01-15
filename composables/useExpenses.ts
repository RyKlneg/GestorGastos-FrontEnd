import { ref, computed } from 'vue';
import type { Expense, ExpenseCreate, ExpenseUpdate, PaginatedResponse, QueryParams } from '~/types/expense';

export const useExpenses = () => {
  const config = useRuntimeConfig();
  const API_BASE = config.public.apiBase;
  const expenses = ref<Expense[]>([]);
  const currentExpense = ref<Expense | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const fetchExpenses = async (params: QueryParams = {}) => {
    loading.value = true;
    error.value = null;
    try {
      const queryString = new URLSearchParams();
      if (params.page) queryString.append('page', params.page.toString());
      if (params.limit) queryString.append('limit', params.limit.toString());
      if (params.query) queryString.append('query', params.query);
      if (params.category) queryString.append('category', params.category);

      const response = await $fetch<PaginatedResponse>(`${API_BASE}/expenses?${queryString}`);
      expenses.value = response.data;
      pagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages,
      };
    } catch (err: any) {
      error.value = err.message || 'Error al cargar gastos';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchExpenseById = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<Expense>(`${API_BASE}/expenses/${id}`);
      currentExpense.value = response;
      return response;
    } catch (err: any) {
      error.value = err.message || 'Error al cargar el gasto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createExpense = async (data: ExpenseCreate) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<Expense>(`${API_BASE}/expenses`, {
        method: 'POST',
        body: data,
      });
      expenses.value.unshift(response);
      return response;
    } catch (err: any) {
      error.value = err.message || 'Error al crear el gasto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateExpense = async (id: number, data: ExpenseUpdate) => {
    loading.value = true;
    error.value = null;
    try {
      const response = await $fetch<Expense>(`${API_BASE}/expenses/${id}`, {
        method: 'PATCH',
        body: data,
      });
      const index = expenses.value.findIndex((e) => e.id === id);
      if (index !== -1) {
        expenses.value[index] = response;
      }
      if (currentExpense.value?.id === id) {
        currentExpense.value = response;
      }
      return response;
    } catch (err: any) {
      error.value = err.message || 'Error al actualizar el gasto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteExpense = async (id: number) => {
    loading.value = true;
    error.value = null;
    try {
      await $fetch(`${API_BASE}/expenses/${id}`, {
        method: 'DELETE',
      });
      expenses.value = expenses.value.filter((e) => e.id !== id);
      if (currentExpense.value?.id === id) {
        currentExpense.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'Error al eliminar el gasto';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const searchExpenses = async (query: string) => {
    if (!query || query.trim().length === 0) {
      return [];
    }
    try {
      const response = await $fetch<Expense[]>(`${API_BASE}/expenses/search?query=${encodeURIComponent(query)}`);
      return response;
    } catch (err: any) {
      error.value = err.message || 'Error al buscar gastos';
      return [];
    }
  };

  return {
    expenses: computed(() => expenses.value),
    currentExpense: computed(() => currentExpense.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    pagination: computed(() => pagination.value),
    fetchExpenses,
    fetchExpenseById,
    createExpense,
    updateExpense,
    deleteExpense,
    searchExpenses,
  };
};

