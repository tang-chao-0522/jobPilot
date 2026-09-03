import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layouts/app-shell';
import {
  Agent,
  Applications,
  Auth,
  Dashboard,
  Interview,
  JobDetail,
  JobForm,
  Jobs,
  Resume,
  SettingsPage,
  Tasks,
} from './features/pages';

function ProtectedRoutes() {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/resume" element={<Resume />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/new" element={<JobForm />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="/agent/runs/:id" element={<Agent />} />
        <Route path="/interviews/:id" element={<Interview />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth />} />
      <Route path="/register" element={<Auth register />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  );
}
