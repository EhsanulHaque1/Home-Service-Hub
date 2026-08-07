import { useNavigate } from 'react-router-dom';
import Chat from '@/components/Chat';

export default function ChatPage() {
  const navigate = useNavigate();

  return <Chat onBack={() => navigate('/')} />;
}
