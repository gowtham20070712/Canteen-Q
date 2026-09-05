import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Navbar, type Page } from '@/components/Navbar';
import { HomePage } from '@/pages/HomePage';
import { StudentPage } from '@/pages/StudentPage';
import { StaffLoginPage } from '@/pages/StaffLoginPage';
import { StaffDashboardPage } from '@/pages/StaffDashboardPage';
import { LoadingSpinner } from '@/components/shared';

function AppContent() {
  const [page, setPage] = useState<Page>('home');
  const { session, loading } = useAuth();

  if (loading) return <LoadingSpinner message="Loading..." />;

  const isStaff = !!session;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage={page} onNavigate={setPage} isStaff={isStaff} />
      <main>
        {page === 'home' && <HomePage onNavigate={setPage} />}
        {page === 'student' && <StudentPage />}
        {page === 'staff' && (isStaff ? <StaffDashboardPage /> : <StaffLoginPage />)}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
