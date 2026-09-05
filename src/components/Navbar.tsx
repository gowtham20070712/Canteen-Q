import { UtensilsCrossed, LayoutDashboard, ShoppingBag, LogIn } from 'lucide-react';

export type Page = 'home' | 'student' | 'staff';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isStaff: boolean;
}

export function Navbar({ currentPage, onNavigate, isStaff }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold text-gray-900 leading-none">Canteen AI</span>
              <span className="block text-[10px] text-gray-400 leading-none mt-0.5">Queue Management</span>
            </div>
          </button>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavButton
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Dashboard"
              active={currentPage === 'home'}
              onClick={() => onNavigate('home')}
            />
            <NavButton
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Order Food"
              active={currentPage === 'student'}
              onClick={() => onNavigate('student')}
            />
            <NavButton
              icon={<LogIn className="w-4 h-4" />}
              label="Staff"
              active={currentPage === 'staff'}
              onClick={() => onNavigate('staff')}
              highlighted={!isStaff}
            />
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  highlighted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-brand-50 text-brand-700'
          : highlighted
            ? 'text-gray-600 hover:bg-gray-50'
            : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
