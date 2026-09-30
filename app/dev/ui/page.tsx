import { notFound } from 'next/navigation';
import { PatternLibrary } from '@/components/dev/PatternLibrary';

/** Musterseite (UI-Plan 13.1): nur in der Entwicklung, ersetzt ein Storybook */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <PatternLibrary />;
}
