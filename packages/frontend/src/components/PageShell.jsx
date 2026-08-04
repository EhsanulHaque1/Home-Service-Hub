import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PageShell({ children }) {
  return (
    <>
      <Navbar />
      <main className="relative pt-28 pb-4">{children}</main>
      <Footer />
    </>
  );
}
