import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Alt+click on a link inside the app opens it in this window. Browsers otherwise open or download
// the link in a new tab, because the router skips modifier clicks.
export default function SameWindowLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      navigate(link.pathname + link.search + link.hash);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return null;
}
