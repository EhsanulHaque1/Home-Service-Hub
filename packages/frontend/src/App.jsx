import Navbar from '@/components/Navbar';
import Homepage from '@/components/Homepage';
import Footer from '@/components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-200">
      <Navbar />
      <Homepage />
      <Footer />
    </div>
  );
}
