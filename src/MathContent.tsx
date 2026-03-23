import React, { useRef, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise?: (elements?: HTMLElement[]) => Promise<void>;
      typeset?: (elements?: HTMLElement[]) => void;
      startup?: { promise?: Promise<void> };
    };
  }
}

/**
 * Trigger MathJax typesetting on an element.
 * Handles: clearing old output, waiting for MathJax to load, and retrying.
 */
function typesetElement(el: HTMLElement) {
  if (!el) return;

  // Clear any previous MathJax-rendered output to avoid duplication
  const oldOutput = el.querySelectorAll('.MathJax, mjx-container, .MathJax_Preview, .MathJax_Display');
  oldOutput.forEach(node => {
    // Only remove MathJax-generated nodes, not the original source
    if (node.parentElement === el || node.closest('[data-mathml]')) {
      // keep
    }
  });

  const doTypeset = () => {
    if (window.MathJax?.typesetPromise) {
      // MathJax 3.x
      window.MathJax.typesetPromise([el]).catch(() => {});
    } else if (window.MathJax?.typeset) {
      try { window.MathJax.typeset([el]); } catch {}
    }
  };

  // If MathJax is loaded, typeset immediately
  if (window.MathJax?.typesetPromise || window.MathJax?.typeset) {
    doTypeset();
  } else {
    // MathJax hasn't loaded yet — retry after a delay  
    const retryDelays = [200, 500, 1000, 2000];
    retryDelays.forEach(delay => {
      setTimeout(() => {
        if (window.MathJax?.typesetPromise || window.MathJax?.typeset) {
          doTypeset();
        }
      }, delay);
    });
  }
}

/**
 * Component renders HTML content and triggers MathJax typesetting.
 * Use this for any text that may contain LaTeX math formulas.
 * Supports: \(...\), $...$, \[...\], $$...$$
 */
export function MathContent({ html, className, tag }: { html: string; className?: string; tag?: 'span' | 'div' | 'h2' | 'h3' | 'p' }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) {
      typesetElement(ref.current);
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
    if (ref.current) {
      typesetElement(ref.current);
    }
  }, deps);

  return ref;
}
