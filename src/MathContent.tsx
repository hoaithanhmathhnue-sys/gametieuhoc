import React, { useRef, useEffect } from 'react';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      typeset?: (elements?: HTMLElement[]) => void;
    };
  }
}

/**
 * Component renders HTML content and triggers MathJax typesetting.
 * Use this for any text that may contain LaTeX math formulas.
 */
export function MathContent({ html, className, tag }: { html: string; className?: string; tag?: 'span' | 'div' | 'h2' | 'h3' | 'p' }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && window.MathJax?.typesetPromise) {
      // Clear previous MathJax output before re-typesetting
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, [html]);

  const Tag = tag || 'span';
  return React.createElement(Tag, {
    ref,
    className,
    dangerouslySetInnerHTML: { __html: html || '' }
  });
}

/**
 * Hook to trigger MathJax typesetting on a specific element ref.
 * Call this after rendering content with math formulas.
 */
export function useMathJax(deps: any[] = []) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && window.MathJax?.typesetPromise) {
      window.MathJax.typesetPromise([ref.current]).catch(() => {});
    }
  }, deps);

  return ref;
}
