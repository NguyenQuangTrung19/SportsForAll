import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { HomePage } from '@/pages/HomePage';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const sport = useSportStore((s) => s.current);
  useEffect(() => {
    applySportTheme(sport);
  }, [sport]);
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </BrowserRouter>
      </ThemeBridge>
    </QueryClientProvider>
  );
}
