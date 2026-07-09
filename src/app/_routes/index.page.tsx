import { PageComponent, useNavigate } from 'rasengan';
import { useEffect } from 'react';

const RootIndex: PageComponent = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/board');
  }, [navigate]);

  return null;
};

RootIndex.path = '/';
RootIndex.metadata = {
  title: 'FYS - Redirection',
};

export default RootIndex;
