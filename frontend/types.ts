
export enum Category {
  FOOD = 'Alimentação',
  TRANSPORT = 'Transporte',
  HOUSING = 'Moradia',
  UTILITIES = 'Contas Fixas',
  ENTERTAINMENT = 'Lazer',
  HEALTH = 'Saúde',
  EDUCATION = 'Educação',
  OTHERS = 'Outros'
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  isRecurring: boolean;
}

export interface BudgetGoal {
  category: Category;
  limit: number;
}

export interface AIInsight {
  title: string;
  content: string;
  severity: 'low' | 'medium' | 'high';
}
