import type { System } from "typescript";

export interface VirtualTypeScriptEnvironment {
  sys: System;
  languageService: import("typescript").LanguageService;
  getSourceFile: (
    fileName: string,
  ) => import("typescript").SourceFile | undefined;
  createFile: (fileName: string, content: string) => void;
  updateFile: (
    fileName: string,
    content: string,
    replaceTextSpan?: import("typescript").TextSpan,
  ) => void;
}
