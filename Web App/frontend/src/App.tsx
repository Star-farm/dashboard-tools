import './App.css';
import { ErrorBoundary } from './ErrorBoundary';
import { Dashboard } from './Dashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
}