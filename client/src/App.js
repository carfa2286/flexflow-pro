import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import NewLoan from './components/NewLoan';
import Settings from './components/Settings';
import Payments from './components/Payments';
import Delinquents from './components/Delinquents';
import Expenses from './components/Expenses';
import Reports from './components/Reports';
import PublicProfiles from './components/PublicProfiles';
import NotificationManager from './components/NotificationManager';

function App() {
  const [page, setPage] = useState('dashboard');
  const [clients, setClients] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [settings, setSettings] = useState({});

  useEffect(() => {
    fetchDashboard();
    fetchClients();
    fetchSettings();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setDashboard(res.data);
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await axios.get('/api/clients');
      setClients(res.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>💎 FlexFlow Pro - by Carlos Martínez</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${page === 'dashboard' ? 'active' : ''}`}
            onClick={() => setPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-btn ${page === 'clients' ? 'active' : ''}`}
            onClick={() => setPage('clients')}
          >
            👥 Clientes
          </button>
          <button
            className={`nav-btn ${page === 'new-loan' ? 'active' : ''}`}
            onClick={() => setPage('new-loan')}
          >
            ➕ Nuevo Préstamo
          </button>
          <button
            className={`nav-btn ${page === 'payments' ? 'active' : ''}`}
            onClick={() => setPage('payments')}
          >
            💳 Pagos
          </button>
          <button
            className={`nav-btn ${page === 'delinquents' ? 'active' : ''}`}
            onClick={() => setPage('delinquents')}
          >
            ⚠️ Morosos
          </button>
          <button
            className={`nav-btn ${page === 'public-profiles' ? 'active' : ''}`}
            onClick={() => setPage('public-profiles')}
          >
            👁️ Reputación
          </button>
          <button
            className={`nav-btn ${page === 'notifications' ? 'active' : ''}`}
            onClick={() => setPage('notifications')}
          >
            💬 Notificaciones
          </button>
          <button
            className={`nav-btn ${page === 'expenses' ? 'active' : ''}`}
            onClick={() => setPage('expenses')}
          >
            💸 Gastos
          </button>
          <button
            className={`nav-btn ${page === 'reports' ? 'active' : ''}`}
            onClick={() => setPage('reports')}
          >
            📊 Reportes
          </button>
          <button
            className={`nav-btn ${page === 'settings' ? 'active' : ''}`}
            onClick={() => setPage('settings')}
          >
            ⚙️ Configuración
          </button>
        </nav>
      </header>

      <main className="container">
        {page === 'dashboard' && (
          <Dashboard dashboard={dashboard} clients={clients} onRefresh={fetchDashboard} />
        )}
        {page === 'clients' && (
          <ClientList clients={clients} onRefresh={fetchClients} />
        )}
        {page === 'new-loan' && (
          <NewLoan
            clients={clients}
            settings={settings}
            onSuccess={() => {
              setPage('dashboard');
              fetchDashboard();
              fetchClients();
            }}
          />
        )}
        {page === 'payments' && (
          <Payments clients={clients} onSuccess={() => {
            fetchDashboard();
            fetchClients();
          }} />
        )}
        {page === 'delinquents' && (
          <Delinquents />
        )}
        {page === 'public-profiles' && (
          <PublicProfiles />
        )}
        {page === 'notifications' && (
          <NotificationManager clients={clients} />
        )}
        {page === 'expenses' && (
          <Expenses />
        )}
        {page === 'reports' && (
          <Reports />
        )}
        {page === 'settings' && (
          <Settings settings={settings} onSave={fetchSettings} />
        )}
      </main>
    </div>
  );
}

export default App;
