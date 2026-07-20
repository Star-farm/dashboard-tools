import '../styles/App.css';
import { ErrorBoundary } from './ErrorBoundary';
import { Dashboard } from '../features/dashboard/Dashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}
