
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { cn } from '@/lib/utils';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className={cn("container py-6")}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
