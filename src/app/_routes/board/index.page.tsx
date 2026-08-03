import { PageComponent } from 'rasengan';
import i18n from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { UserRole } from '@/entities';
import { AdminHome } from '@/components/features/home/AdminHome';
import { CustomerHome } from '@/components/features/home/CustomerHome';

const Home: PageComponent = () => {
  const { user } = useAuthStore();

  // Sans connexion : expérience visiteur (page d'accueil publique).
  if (!user) return <CustomerHome />;

  return user.role === UserRole.ADMIN
    ? <AdminHome name={user.name} />
    : <CustomerHome />;
};

Home.metadata = {
  title: i18n.t('home.admin.pageTitle'),
  description: i18n.t('home.admin.pageDescription'),
};

export default Home;
