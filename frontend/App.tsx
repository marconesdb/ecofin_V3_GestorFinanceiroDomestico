import React, { useState, useMemo, useEffect } from 'react';
import { 
  PlusIcon, TrashIcon, ChartBarIcon, ListBulletIcon, 
  WalletIcon, MagnifyingGlassIcon, 
  ArrowPathIcon, CreditCardIcon,
  ArrowTrendingDownIcon, AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { Expense, Category, BudgetGoal } from './types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const API_URL = 'http://localhost:3001/api';

const App: React.FC = () => {
  // --- Estado ---
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetGoals, setBudgetGoals] = useState<BudgetGoal[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<Category>(Category.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'list' | 'budgets'>('dashboard');

  // --- Sincronização com Node.js API ---
  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const expRes = await fetch(`${API_URL}/expenses`);
      const budRes = await fetch(`${API_URL}/budgets`);

      if (expRes.ok && budRes.ok) {
        const expData = await expRes.json();
        const budData = await budRes.json();

        // ✅ CORRIGIDO: backend retorna { data: [...] }, com fallback para array direto
        setExpenses(expData.data ?? expData);

        // ✅ monthly_limit → limit
        setBudgetGoals(budData.map((b: any) => ({
          category: b.category,
          limit: b.monthly_limit
        })));
      } else {
        throw new Error("Backend offline");
      }
    } catch (error) {
      console.warn("Usando armazenamento local (Backend não detectado)");
      const savedExp = localStorage.getItem('ecofin_expenses');
      const savedBud = localStorage.getItem('ecofin_budgets');
      if (savedExp) setExpenses(JSON.parse(savedExp));
      if (savedBud) setBudgetGoals(JSON.parse(savedBud));
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem('ecofin_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ecofin_budgets', JSON.stringify(budgetGoals));
  }, [budgetGoals]);

  // --- Ações ---
  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description,
      amount: parseFloat(amount),
      category,
      date,
      isRecurring: false
    };

    setExpenses(prev => [newExpense, ...prev]);
    setDescription('');
    setAmount('');

    try {
      await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense)
      });
    } catch (e) { console.error("Erro ao sincronizar com Node.js"); }
  };

  const removeExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE' });
    } catch (e) { console.error("Erro ao remover do backend"); }
  };

  const updateBudget = async (cat: Category, limit: number) => {
    const newBudgets = [...budgetGoals];
    const index = newBudgets.findIndex(b => b.category === cat);
    if (index > -1) {
      newBudgets[index].limit = limit;
    } else {
      newBudgets.push({ category: cat, limit });
    }
    setBudgetGoals(newBudgets);

    try {
      await fetch(`${API_URL}/budgets`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, limit })
      });
    } catch (e) { console.error("Erro ao atualizar orçamento no backend"); }
  };

  // --- Cálculos ---
  const totalSpent = useMemo(() => expenses.reduce((acc, curr) => acc + curr.amount, 0), [expenses]);

  const categoryData = useMemo(() => {
    const dataMap: Record<string, { spent: number, limit: number }> = {};
    Object.values(Category).forEach(cat => {
      const goal = budgetGoals.find(g => g.category === cat);
      dataMap[cat] = { spent: 0, limit: goal?.limit || 0 };
    });
    expenses.forEach(exp => {
      if (dataMap[exp.category]) dataMap[exp.category].spent += exp.amount;
    });
    return Object.entries(dataMap).map(([name, data]) => ({
      name,
      value: data.spent,
      limit: data.limit,
      percent: data.limit > 0 ? (data.spent / data.limit) * 100 : 0
    })).filter(d => d.value > 0 || d.limit > 0);
  }, [expenses, budgetGoals]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12 font-sans selection:bg-emerald-100">
      {/* Navbar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-200 group-hover:rotate-12 transition-all">
              <WalletIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-800">Eco<span className="text-emerald-600">Fin</span></span>
          </div>

          <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-2xl">
            {(['dashboard', 'list', 'budgets'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === v ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {v === 'dashboard' ? 'Visão Geral' : v === 'list' ? 'Transações' : 'Orçamentos'}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={fetchData} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors bg-slate-50 rounded-lg border border-slate-100">
              <ArrowPathIcon className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* Coluna Esquerda: Formulário */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-800">
                <PlusIcon className="w-6 h-6 text-emerald-500" strokeWidth={2.5} />
                Lançamento Rápido
              </h2>
              <form onSubmit={addExpense} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Ex: Mercado Central"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data</label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Categoria</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as Category)}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-600 font-medium"
                    >
                      {Object.values(Category).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ListBulletIcon className="w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 hover:shadow-emerald-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Salvar Despesa
                </button>
              </form>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="lg:col-span-8 space-y-10">

            {/* Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Despesa Total</p>
                  <h3 className="text-4xl font-black text-slate-800">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
                </div>
                <div className="bg-red-50 p-4 rounded-3xl group-hover:bg-red-100 transition-colors">
                  <ArrowTrendingDownIcon className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total de Movimentações</p>
                  <h3 className="text-4xl font-black text-slate-800">{expenses.length}</h3>
                </div>
                <div className="bg-emerald-50 p-4 rounded-3xl group-hover:bg-emerald-100 transition-colors">
                  <ChartBarIcon className="w-8 h-8 text-emerald-500" />
                </div>
              </div>
            </div>

            {/* Dashboard */}
            {view === 'dashboard' && (
              <div className="space-y-10">
                <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-8 text-slate-800 flex items-center gap-2">
                    <ChartBarIcon className="w-5 h-5 text-emerald-600" />
                    Gastos por Categoria
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} barSize={45}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={12} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[15, 15, 15, 15]}>
                          {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold mb-8 text-slate-800 flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-emerald-600" />
                    Progresso do Orçamento
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                    {categoryData.filter(d => d.limit > 0).map((d, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-xs font-bold text-slate-400 uppercase block mb-0.5 tracking-tight">{d.name}</span>
                            <span className="text-sm font-black text-slate-700">R$ {d.value.toFixed(2)} / R$ {d.limit.toFixed(2)}</span>
                          </div>
                          <span className={`text-xs font-black p-1.5 rounded-lg ${d.percent > 100 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                            {d.percent.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${d.percent > 100 ? 'bg-red-500' : 'bg-emerald-500 shadow-inner shadow-emerald-400'}`}
                            style={{ width: `${Math.min(d.percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {categoryData.filter(d => d.limit > 0).length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                        <p className="text-slate-400 font-medium italic">Vá na aba "Orçamentos" para definir seus limites mensais.</p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Lista de Transações */}
            {view === 'list' && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-6">
                  <h3 className="text-lg font-bold text-slate-800">Extrato Consolidado</h3>
                  <div className="relative flex-1 max-w-sm">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Pesquisar por descrição ou categoria..."
                      className="w-full pl-12 pr-5 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/70">
                      <tr>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                        <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                        <th className="px-8 py-5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {expenses
                        .filter(e =>
                          e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.category.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map(exp => (
                          <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-8 py-6 text-xs font-bold text-slate-400">
                              {new Date(exp.date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-slate-800">{exp.description}</p>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{exp.category}</span>
                            </td>
                            <td className="px-8 py-6 text-sm font-black text-slate-900 text-right">
                              R$ {exp.amount.toFixed(2)}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button
                                onClick={() => removeExpense(exp.id)}
                                className="p-2.5 text-slate-200 hover:text-red-500 bg-transparent hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <TrashIcon className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orçamentos */}
            {view === 'budgets' && (
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-slate-800">Metas de Gastos Mensais</h3>
                  <p className="text-slate-400 text-sm mt-1">Defina quanto você pretende gastar em cada categoria.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {Object.values(Category).map(cat => (
                    <div key={cat} className="group p-8 bg-slate-50 rounded-[2rem] border-2 border-transparent hover:border-emerald-200 hover:bg-white transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-100/50">
                      <label className="block text-[11px] font-black text-slate-400 uppercase mb-4 tracking-widest">{cat}</label>
                      <div className="flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-2xl">
                          <CreditCardIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 flex items-baseline gap-1">
                          <span className="text-slate-300 font-black text-xl">R$</span>
                          <input
                            type="number"
                            value={budgetGoals.find(g => g.category === cat)?.limit || ''}
                            onChange={e => updateBudget(cat, parseFloat(e.target.value) || 0)}
                            placeholder="Definir limite"
                            className="w-full bg-transparent border-none p-0 text-2xl font-black text-slate-800 focus:ring-0 placeholder:text-slate-200 placeholder:font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;