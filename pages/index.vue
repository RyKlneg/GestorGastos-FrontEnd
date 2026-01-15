<template>
  <div class="container mx-auto p-4">
    <UContainer>
      <div class="mb-6">
        <h1 class="text-3xl text-black font-bold mb-2">Gestión de Gastos</h1>
        <p class="text-black">Administra tus gastos de forma eficiente</p>
      </div>

      <!-- Header Actions -->
      <div class="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <UButton
          color="primary"
          size="lg"
          icon="i-heroicons-plus"
          @click="openCreateModal"
        >
          Nuevo Gasto
        </UButton>

        <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <UInput
            v-model="searchQuery"
            placeholder="Buscar por descripción..."
            icon="i-heroicons-magnifying-glass"
            class="w-full sm:w-64"
            @input="handleSearch"
          />

          <USelect
            v-model="selectedCategory"
            :options="categoryOptions"
            placeholder="Todas las categorías"
            class="w-full sm:w-48"
            @change="handleFilter"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="expensesStore.loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="expensesStore.error"
        color="red"
        variant="soft"
        :title="String(expensesStore.error || '')"
        class="mb-4"
      />

      <!-- Empty State -->
      <UCard
        v-else-if="expensesStore.expenses.length === 0"
        class="text-center py-12"
      >
        <UIcon name="i-heroicons-document-text" class="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 class="text-xl font-semibold mb-2">No hay gastos registrados</h3>
        <p class="text-gray-600 mb-4">Comienza agregando tu primer gasto</p>
        <UButton color="primary" @click="openCreateModal">
          Agregar Gasto
        </UButton>
      </UCard>

      <!-- Expenses Table -->
      <UCard v-else>
        <UTable
          :rows="expensesStore.expenses"
          :columns="columns"
          :loading="expensesStore.loading"
          class="w-full"
        >
          <template #amount-data="{ row }">
            <span class="font-semibold">${{ formatAmount(row.amount) }}</span>
          </template>

          <template #date-data="{ row }">
            {{ formatDate(row.date) }}
          </template>

          <template #category-data="{ row }">
            <UBadge :color="getCategoryColor(row.category)">
              {{ row.category }}
            </UBadge>
          </template>

          <template #actions-data="{ row }">
            <div class="flex gap-2">
              <UButton
                color="blue"
                variant="ghost"
                icon="i-heroicons-pencil"
                size="sm"
                @click="openEditModal(row)"
              />
              <UButton
                color="red"
                variant="ghost"
                icon="i-heroicons-trash"
                size="sm"
                @click="confirmDelete(row)"
              />
            </div>
          </template>
        </UTable>

        <!-- Pagination -->
        <div class="mt-4 flex justify-between items-center">
          <p class="text-sm text-gray-600">
            Mostrando {{ (expensesStore.pagination.page - 1) * expensesStore.pagination.limit + 1 }} -
            {{ Math.min(expensesStore.pagination.page * expensesStore.pagination.limit, expensesStore.pagination.total) }}
            de {{ expensesStore.pagination.total }} gastos
          </p>

          <UPagination
            v-model="currentPage"
            :page-count="expensesStore.pagination.limit"
            :total="expensesStore.pagination.total"
            :max="7"
            @update:model-value="handlePageChange"
          />
        </div>
      </UCard>

      <!-- Create/Edit Modal -->
      <UModal v-model="isModalOpen" :ui="{ width: 'sm:max-w-md' }">
        <UCard>
          <template #header>
            <h3 class="text-xl font-semibold">
              {{ isEditing ? 'Editar Gasto' : 'Nuevo Gasto' }}
            </h3>
          </template>

          <form @submit.prevent="handleSubmit">
            <UFormGroup label="Descripción" required :error="formErrors.description">
              <UInput
                v-model="formState.description"
                placeholder="Ej: Compra de alimentos"
                :disabled="expensesStore.loading"
                :error="!!formErrors.description"
              />
            </UFormGroup>

            <UFormGroup label="Monto" required class="mt-4" :error="formErrors.amount">
              <UInput
                v-model="formState.amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                :disabled="expensesStore.loading"
                :error="!!formErrors.amount"
              />
            </UFormGroup>

            <UFormGroup label="Fecha" required class="mt-4" :error="formErrors.date">
              <UInput
                v-model="formState.date"
                type="date"
                :disabled="expensesStore.loading"
                :error="!!formErrors.date"
              />
            </UFormGroup>

            <UFormGroup label="Categoría" required class="mt-4" :error="formErrors.category">
              <USelect
                v-model="formState.category"
                :options="categories"
                placeholder="Selecciona una categoría"
                :disabled="expensesStore.loading"
                :error="!!formErrors.category"
              />
            </UFormGroup>

            <div class="mt-6 flex gap-3 justify-end">
              <UButton
                type="button"
                color="gray"
                variant="ghost"
                @click="closeModal"
                :disabled="expensesStore.loading"
              >
                Cancelar
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="expensesStore.loading"
              >
                {{ isEditing ? 'Actualizar' : 'Crear' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model="isDeleteModalOpen">
        <UCard>
          <template #header>
            <h3 class="text-xl font-semibold text-red-600">Confirmar Eliminación</h3>
          </template>

          <p class="mb-4">
            ¿Estás seguro de que deseas eliminar el gasto
            <strong>"{{ selectedExpense?.description }}"</strong>?
            Esta acción no se puede deshacer.
          </p>

          <div class="flex gap-3 justify-end">
            <UButton
              color="gray"
              variant="ghost"
              @click="isDeleteModalOpen = false"
              :disabled="expensesStore.loading"
            >
              Cancelar
            </UButton>
            <UButton
              color="red"
              @click="handleDelete"
              :loading="expensesStore.loading"
            >
              Eliminar
            </UButton>
          </div>
        </UCard>
      </UModal>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import type { Expense, ExpenseCreate } from '~/types/expense';

const expensesStore = reactive(useExpenses());
const toast = useToast();

// Search and filter
const searchQuery = ref('');
const selectedCategory = ref<string | undefined>(undefined);
const currentPage = ref(1);

const categories = [
  'Alimentos',
  'Transporte',
  'Servicios',
  'Salud',
  'Educación',
  'Entretenimiento',
  'Tecnología',
  'Ropa',
  'Otros',
];

const categoryOptions = [
  { label: 'Todas las categorías', value: undefined },
  ...categories.map((cat) => ({ label: cat, value: cat })),
];

// Modal state
const isModalOpen = ref(false);
const isDeleteModalOpen = ref(false);
const isEditing = ref(false);
const selectedExpense = ref<Expense | null>(null);

// Form state
const formState = reactive<Omit<ExpenseCreate, 'amount'> & { amount: number | string }>({
  description: '',
  amount: '' as number | string,
  date: new Date().toISOString().split('T')[0],
  category: '',
});

// Helper function to reset form
const resetForm = () => {
  formState.description = '';
  formState.amount = '';
  formState.date = new Date().toISOString().split('T')[0];
  formState.category = '';
  formErrors.description = '';
  formErrors.amount = '';
  formErrors.date = '';
  formErrors.category = '';
};

const formErrors = reactive({
  description: '',
  amount: '',
  date: '',
  category: '',
});

const validateForm = () => {
  let isValid = true;
  
  formErrors.description = '';
  formErrors.amount = '';
  formErrors.date = '';
  formErrors.category = '';

  if (!formState.description || formState.description.trim().length === 0) {
    formErrors.description = 'La descripción es requerida';
    isValid = false;
  } else if (formState.description.length > 255) {
    formErrors.description = 'La descripción no puede exceder 255 caracteres';
    isValid = false;
  }

  const amountValue = typeof formState.amount === 'string' ? parseFloat(formState.amount) : formState.amount;
  if (!amountValue || amountValue <= 0 || isNaN(amountValue)) {
    formErrors.amount = 'El monto debe ser mayor a 0';
    isValid = false;
  }

  if (!formState.date) {
    formErrors.date = 'La fecha es requerida';
    isValid = false;
  }

  if (!formState.category || formState.category.trim().length === 0) {
    formErrors.category = 'La categoría es requerida';
    isValid = false;
  } else if (formState.category.length > 50) {
    formErrors.category = 'La categoría no puede exceder 50 caracteres';
    isValid = false;
  }

  return isValid;
};

// Table columns
const columns = [
  { key: 'id', label: 'ID', sortable: true },
  { key: 'description', label: 'Descripción', sortable: true },
  { key: 'amount', label: 'Monto' },
  { key: 'date', label: 'Fecha', sortable: true },
  { key: 'category', label: 'Categoría' },
  { key: 'actions', label: 'Acciones' },
];

// Methods
const formatAmount = (amount: number | string) => {
  return parseFloat(amount.toString()).toFixed(2);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getCategoryColor = (category: string): any => {
  const colors: Record<string, string> = {
    Alimentos: 'green',
    Transporte: 'blue',
    Servicios: 'purple',
    Salud: 'red',
    Educación: 'orange',
    Entretenimiento: 'pink',
    Tecnología: 'indigo',
    Ropa: 'yellow',
  };
  return colors[category] || 'gray';
};

const loadExpenses = async () => {
  try {
    await expensesStore.fetchExpenses({
      page: currentPage.value,
      limit: 10,
      query: searchQuery.value || undefined,
      category: selectedCategory.value || undefined,
    });
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'No se pudieron cargar los gastos',
      color: 'red',
    });
  }
};

const handleSearch = async () => {
  currentPage.value = 1;
  await loadExpenses();
};

const handleFilter = async () => {
  currentPage.value = 1;
  await loadExpenses();
};

const handlePageChange = async () => {
  await loadExpenses();
};

const openCreateModal = () => {
  isEditing.value = false;
  selectedExpense.value = null;
  resetForm();
  isModalOpen.value = true;
};

const openEditModal = (expense: Expense) => {
  isEditing.value = true;
  selectedExpense.value = expense;
  formState.description = expense.description;
  formState.amount = parseFloat(expense.amount.toString());
  formState.date = new Date(expense.date).toISOString().split('T')[0];
  formState.category = expense.category;
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedExpense.value = null;
  resetForm();
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  try {
    // Convert amount to number
    const amountValue = typeof formState.amount === 'string' ? parseFloat(formState.amount) : formState.amount;
    const expenseData: ExpenseCreate = {
      description: formState.description,
      amount: amountValue || 0,
      date: formState.date,
      category: formState.category,
    };

    if (isEditing.value && selectedExpense.value) {
      await expensesStore.updateExpense(selectedExpense.value.id, expenseData);
      toast.add({
        title: 'Éxito',
        description: 'Gasto actualizado correctamente',
        color: 'green',
      });
    } else {
      await expensesStore.createExpense(expenseData);
      toast.add({
        title: 'Éxito',
        description: 'Gasto creado correctamente',
        color: 'green',
      });
    }
    closeModal();
    await loadExpenses();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Error al guardar el gasto',
      color: 'red',
    });
  }
};

const confirmDelete = (expense: Expense) => {
  selectedExpense.value = expense;
  isDeleteModalOpen.value = true;
};

const handleDelete = async () => {
  if (!selectedExpense.value) return;

  try {
    await expensesStore.deleteExpense(selectedExpense.value.id);
    toast.add({
      title: 'Éxito',
      description: 'Gasto eliminado correctamente',
      color: 'green',
    });
    isDeleteModalOpen.value = false;
    selectedExpense.value = null;
    await loadExpenses();
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Error al eliminar el gasto',
      color: 'red',
    });
  }
};

// Lifecycle
onMounted(() => {
  loadExpenses();
});

// Watch for route changes if needed
watch([searchQuery, selectedCategory], () => {
  if (searchQuery.value || selectedCategory.value) {
    handleSearch();
  }
});
</script>

<style scoped>
.container {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>

