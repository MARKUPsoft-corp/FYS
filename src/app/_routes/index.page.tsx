import { PageComponent } from 'rasengan';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';
import { AdminHome } from '@/components/features/home/AdminHome';
import { CustomerHome } from '@/components/features/home/CustomerHome';

const Home: PageComponent = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  return user.role === UserRole.ADMIN
    ? <AdminHome name={user.name} />
    : <CustomerHome name={user.name} />;
};

Home.metadata = {
  title: 'FYS — Accueil',
  description: 'Tableau de bord FYS.',
};

export default Home;
