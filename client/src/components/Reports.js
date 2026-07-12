import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Reports() {
  const [reportType, setReportType] = useState('monthly');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport('monthly');
  }, []);

  const loadReport = async (type) => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/reports/${type}`);
      setData(res.data);
      setReportType(type);
    } catch (err) {
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const COLORS = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className="reports-page">
      <h2>📊 Reportes Financieros</h2>

      <div className="report-buttons">
        <button
          className={`report-btn ${reportType === 'monthly' ? 'active' : ''}`}
          onClick={() => loadReport('monthly')}
        >
          📅 Mensual
        </button>
        <button
          className={`report-btn ${reportType === 'yearly' ? 'active' : ''}`}
          onClick={() => loadReport('yearly')}
        >
          📈 Anual
        </button>
        <button
          className={`report-btn ${reportType === 'category' ? 'active' : ''}`}
          onClick={() => loadReport('category')}
        >
          🏷️ Por Categoría
        </button>
        <button
          className={`report-btn ${reportType === 'client' ? 'active' : ''}`}
          onClick={() => loadReport('client')}
        >
          👥 Por Cliente
        </button>
      </div>

      {loading ? (
        <p>Cargando reporte...</p>
      ) : data ? (
        <>
          {/* Resumen */}
          {data.summary && (
            <div className="cards-container">
              <div className="card">
                <h3>💰 Total Prestado</h3>
                <p className="amount">${(data.summary.total_loaned / 1000000).toFixed(1)}M</p>
              </div>
              <div className="card earning-card">
                <h3>💵 Total Ganado</h3>
                <p className="amount earning">${(data.summary.total_earned / 1000).toFixed(0)}K</p>
              </div>
              <div className="card highlight">
                <h3>📊 Proyección</h3>
                <p className="amount earning">${(data.summary.projection / 1000).toFixed(0)}K</p>
              </div>
            </div>
          )}

          {/* Gráficos */}
          {data.chartData && data.chartData.length > 0 && (
            <div className="charts-container">
              {reportType === 'monthly' || reportType === 'yearly' ? (
                <div className="chart">
                  <h3>Evolución de Ganancias</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="ganancia" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : reportType === 'category' ? (
                <div className="chart">
                  <h3>Gastos por Categoría</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: $${(value / 1000).toFixed(0)}K`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="chart">
                  <h3>Clientes con Mayor Deuda</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Bar dataKey="deuda" fill="#667eea" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Tabla de Detalles */}
          {data.details && data.details.length > 0 && (
            <div className="table-container">
              <h3>Detalles</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Monto</th>
                    <th>Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.name}</td>
                      <td><strong>${(row.value / 1000).toFixed(0)}K</strong></td>
                      <td style={{ color: row.change > 0 ? '#10b981' : '#ef4444' }}>
                        {row.change > 0 ? '↑' : '↓'} {Math.abs(row.change)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p>Sin datos disponibles</p>
      )}
    </div>
  );
}

export default Reports;
