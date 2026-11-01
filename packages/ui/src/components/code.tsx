"use client";

import {
  createContext,
  Fragment,
  useContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import type { Dispatch, JSX, ReactNode, SetStateAction } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from "shiki";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { logError } from "./error-log.tsx";
import { useTheme } from "next-themes";

type MapHighlighter = Map<
  string,
  | HighlighterGeneric<BundledLanguage, BundledTheme>
  | Promise<HighlighterGeneric<BundledLanguage, BundledTheme>>
>;

const codeContext = createContext<
  | {
      highlighters: MapHighlighter;
      setHighlighters: Dispatch<SetStateAction<MapHighlighter>>;
    }
  | undefined
>(undefined);

export function CodeProvider({ children }: { children?: ReactNode }) {
  const [highlighters, setHighlighters] = useState<MapHighlighter>(new Map());

  return (
    <codeContext.Provider value={{ highlighters, setHighlighters }}>
      {children}
    </codeContext.Provider>
  );
}

export function useCode() {
  const context = useContext(codeContext);

  const getHighlighter = useCallback(
    (lang: string, theme: BundledTheme) => {
      if (!context) {
        throw new Error(
          "You can only useCode() within a CodeProvider context.",
        );
      }

      const highlighterId = `${lang}___${theme}`;
      const highlighter = context.highlighters.get(highlighterId);

      if (highlighter) {
        if (highlighter instanceof Promise) {
          return { highlighterPromise: highlighter };
        }
        return { highlighter };
      }

      const highlighterPromise = (async () => {
        try {
          const { createHighlighter } = await import("shiki");
          const highlighter = await createHighlighter({
            langs: [lang],
            themes: [theme],
          });

          context.setHighlighters(
            (prev) => new Map([...prev, [highlighterId, highlighter]]),
          );

          return highlighter;
        } catch (error) {
          logError("useCode() highlighterPromise", error);
          throw error;
        }
      })();

      context?.setHighlighters(
        (prev) => new Map([...prev, [highlighterId, highlighterPromise]]),
      );

      return { highlighterPromise };
    },
    [context],
  );

  return { getHighlighter };
}

export function Code({
  children: code,
  fallback,
  lang = "text",
}: {
  children?: string;
  fallback?: ReactNode;
  lang?: string;
}) {
  const { resolvedTheme } = useTheme();
  const { getHighlighter } = useCode();

  const [nodes, setNodes] = useState<JSX.Element>();

  useEffect(() => {
    const theme = resolvedTheme === "dark" ? "one-dark-pro" : "one-light";
    const { highlighter, highlighterPromise } = getHighlighter(lang, theme);
    let active = true;
    void Promise.resolve(highlighter ?? highlighterPromise)
      .then((loaded) => {
        const hast = loaded?.codeToHast(code ?? "", { lang, theme });
        if (active && hast) {
          setNodes(toJsxRuntime(hast, { Fragment, jsx, jsxs }) as JSX.Element);
        }
      })
      .catch(() => {
        /* getHighlighter already records loading failures. */
      });
    return () => {
      active = false;
    };
  }, [resolvedTheme, getHighlighter, code, lang]);

  return nodes ?? fallback;
}
