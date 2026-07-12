# 💰 Gestor de Préstamos

Aplicación web moderna para gestionar préstamos a clientes con reportes visuales, cálculos automáticos de intereses y recordatorios de pago.

## ✨ Características

✅ **Porcentaje Flexible** - Configura 10%, 15%, 20% o el que quieras
✅ **Frecuencia Variable** - Pago diario, semanal, quincenal o mensual
✅ **Dashboard** - Ve totales, ganancias y pagos pendientes en tiempo real
✅ **Base de Datos de Clientes** - Gestiona todos tus clientes en un lugar
✅ **Reportes Visuales** - Gráficos de ganancia y comparativas
✅ **Cálculos Automáticos** - Intereses calculados según configuración
✅ **Recordatorios** - Sistema automático de notificaciones (futuro)

## 🚀 Inicio Rápido

### 1. Instalar dependencias backend
```bash
cd /Users/fabian/Downloads/loan-app
npm install
```

### 2. Instalar dependencias frontend
```bash
cd client
npm install
```

### 3. Iniciar servidor backend
```bash
# Desde la carpeta loan-app
npm start
```
El servidor corre en: `http://localhost:5000`

### 4. Iniciar frontend (otra terminal)
```bash
cd client
npm start
```
La app abre en: `http://localhost:3000`

## 📋 Cómo Usar

### Configuración Inicial
1. Ve a **⚙️ Configuración**
2. Elige tu porcentaje predeterminado (10%, 15%, 20%)
3. Selecciona frecuencia de pago (diario, quincenal, mensual)
4. Guarda

### Agregar Clientes
1. Ve a **👥 Clientes**
2. Completa: Nombre, teléfono, email
3. Clic en "Guardar Cliente"

### Crear Préstamo
1. Ve a **➕ Nuevo Préstamo**
2. Selecciona cliente
3. Ingresa monto
4. Elige porcentaje e intervalo de pago
5. Clic "Calcular Vista Previa" para ver ganancias
6. Clic "Crear Préstamo"

### Ver Reportes
1. Ve a **📊 Dashboard**
2. Mira: Total prestado, ganado, préstamos activos
3. Gráficos de comparativa y proporción

## 🗄️ Base de Datos

Usa SQLite (archivo `loans.db`). Tablas:
- **clients** - Clientes registrados
- **loans** - Préstamos activos
- **payments** - Pagos realizados
- **settings** - Configuración global

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/dashboard` | Totales y resumen |
| GET | `/api/clients` | Lista clientes |
| POST | `/api/clients` | Crear cliente |
| POST | `/api/loans` | Crear préstamo |
| GET | `/api/loans/:client_id` | Préstamos de cliente |
| POST | `/api/payments` | Registrar pago |
| GET | `/api/settings` | Configuración actual |
| POST | `/api/settings` | Actualizar configuración |

## 💡 Ejemplo de Flujo

1. Configuras 15% de interés + pago mensual
2. Prestas $1000 a Juan
3. Sistema calcula: $1000 × 15% = $150 de ganancia por mes
4. Cada pago registrado suma $150 a tus ganancias
5. Dashboard muestra: Total prestado, total ganado, clientes morosos

## 🛠️ Tech Stack

- **Frontend**: React 18, Recharts (gráficos), Axios
- **Backend**: Node.js, Express
- **BD**: SQLite3
- **Automatización**: node-cron (recordatorios futuros)

## 📝 Notas

- La BD se crea automáticamente en la primera ejecución
- Los recordatorios de email requieren configurar SMTP (futuro)
- Todos los cálculos son en tiempo real
- Datos persisten en `loans.db`

## 🔄 Próximas Mejoras

- [ ] Envío automático de recordatorios por email
- [ ] Exportar reportes a PDF
- [ ] Historial de pagos detallado
- [ ] Sistema de alertas para morosos
- [ ] Dashboard móvil responsive

---

**Creado para:** Carlos Martínez - Ingeniero Industrial
**Fecha:** Julio 2026
