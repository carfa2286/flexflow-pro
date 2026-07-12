import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

function Dashboard({ dashboard, clients, onRefresh }) {
  const [topClient, setTopClient] = useState(null);
  const [riskClient, setRiskClient] = useState(null);

  // Cargar scores de clientes
  useEffect(() => {
    if (clients.length === 0) return;

    const scorePromises = clients.map(client =>
      axios.get(`/api/clients/${client.id}/score`)
        .then(res => ({ ...client, score: res.data }))
        .catch(() => ({ ...client, score: { credit_score: 0 } }))
    );

    Promise.all(scorePromises).then(clientsWithScores => {
      const sorted = clientsWithScores.sort((a, b) => (b.score.credit_score || 0) - (a.score.credit_score || 0));
      setTopClient(sorted[0] || null);
      setRiskClient(sorted[sorted.length - 1] || null);
    });
  }, [clients]);

  const data = [
    { name: 'Total Prestado', value: dashboard.total_loaned || 0 },
    { name: 'Total Ganado', value: dashboard.total_earned || 0 }
  ];

  const COLORS = ['#0088FE', '#00C49F'];

  return (
    <div className="dashboard">
      <h2>📊 Dashboard de Préstamos</h2>
      <button onClick={onRefresh} className="refresh-btn">🔄 Actualizar</button>

      {/* Cards de Totales */}
      <div className="cards-container">
        <div className="card">
          <h3>💵 Total Prestado</h3>
          <p className="amount">${((dashboard.total_loaned || 0) / 1000000).toFixed(1)}M</p>
          <small>${(dashboard.total_loaned || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</small>
        </div>
        <div className="card earning-card">
          <h3>💰 Total Ganado (Acumulado)</h3>
          <p className="amount earning">${((dashboard.total_earned || 0) / 1000).toFixed(0)}K</p>
          <small>${(dashboard.total_earned || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</small>
        </div>
        <div className="card highlight">
          <h3>📈 Ganancia Mensual (Proyectada)</h3>
          <p className="amount earning">${((dashboard.monthly_projection || 0) / 1000).toFixed(0)}K</p>
          <small>${(dashboard.monthly_projection || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}/mes</small>
        </div>
        <div className="card">
          <h3>📊 Total Préstamos</h3>
          <p className="amount">{dashboard.total_loans || 0}</p>
          <small>Activos</small>
        </div>
        {topClient && (
          <div className="card highlight" style={{ borderLeft: '4px solid #10b981' }}>
            <h3>👤 Mejor Calificado</h3>
            <p className="amount" style={{ color: '#10b981' }}>{'⭐'.repeat(Math.round((topClient.score.credit_score || 0) / 20))}</p>
            <small><strong>{topClient.name}</strong></small>
            <small>Score: {topClient.score.credit_score || 0}/100</small>
          </div>
        )}
        {riskClient && (
          <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
            <h3>📉 Necesita Atención</h3>
            <p className="amount" style={{ color: '#ef4444' }}>⚠️</p>
            <small><strong>{riskClient.name}</strong></small>
            <small>Score: {riskClient.score.credit_score || 0}/100</small>
          </div>
        )}
      </div>

      {/* Gráficos */}
      <div className="charts-container">
        <div className="chart">
          <h3>Comparativa Prestado vs Ganado</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>Proporción Ganancia</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="info-box">
        <h3>📝 Resumen</h3>
        <p>
          Tienes <strong>{dashboard.total_loans || 0}</strong> préstamos activos.
          Has ganado <strong>${(dashboard.total_earned || 0).toFixed(2)}</strong> en intereses.
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
