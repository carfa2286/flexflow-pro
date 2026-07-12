import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Expenses() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState([]);
  const [totalMonth, setTotalMonth] = useState(0);

  const categories = [
    '💰 Préstamo',
    '🏦 Banco',
    '💡 Servicios Públicos',
    '👩‍💼 Empleada Doméstica',
    '🛒 Compras',
    '🍔 Alimentación',
    '🏥 Salud',
    '📚 Educación',
    '🚗 Transporte',
    '📱 Comunicación',
    '🏠 Arriendo',
    'Otro'
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await axios.get('/api/expenses');
      setExpenses(res.data || []);
      calculateTotal(res.data);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const calculateTotal = (data) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const total = data
      .filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    setTotalMonth(total);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!description || !amount || !category) {
      alert('Completa todos los campos');
      return;
    }

    try {
      await axios.post('/api/expenses', {
        description,
        amount: parseFloat(amount),
        category,
        date
      });
      setDescription('');
      setAmount('');
      setCategory('');
      alert('✅ Gasto registrado');
      loadExpenses();
    } catch (err) {
      alert('❌ Error: ' + err.message);
    }
  };

  return (
    <div className="expenses-page">
      <h2>💸 Registro de Gastos</h2>

      <div className="cards-container">
        <div className="card highlight">
          <h3>💰 Gastos Este Mes</h3>
          <p className="amount" style={{ color: '#ef4444' }}>
            ${(totalMonth / 1000).toFixed(0)}K
          </p>
          <small>${totalMonth.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</small>
        </div>
      </div>

      <div className="form-card">
        <h3>Agregar Gasto</h3>
        <form onSubmit={handleAddExpense}>
          <div className="form-group">
            <label>Descripción *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago de agua"
              required
            />
          </div>

          <div className="form-group">
            <label>Categoría *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">-- Selecciona categoría --</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label>Monto ($) *</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Fecha *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary">➕ Registrar Gasto</button>
        </form>
      </div>

      <div className="table-container">
        <h3>📋 Últimos Gastos</h3>
        {expenses.length === 0 ? (
          <p className="empty-state">No hay gastos registrados</p>
        ) : (
          <table className="expenses-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30).map((exp, idx) => (
                <tr key={exp.id}>
                  <td>{idx + 1}</td>
                  <td>{exp.category}</td>
                  <td>{exp.description}</td>
                  <td><strong>${(exp.amount / 1000).toFixed(0)}K</strong></td>
                  <td>{new Date(exp.date).toLocaleDateString('es-CO')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Expenses;
