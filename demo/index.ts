import { EditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { autocompletion } from "@codemirror/autocomplete";
import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import ts from "typescript";
import {
  tsLinter,
  tsHover,
  tsAutocomplete,
  tsSync,
  tsFacet,
} from "@valtown/codemirror-ts";
import { setupTypeAcquisition } from "../src/index";

(async () => {
  const fsMap = await createDefaultMapFromCDN(
    { target: ts.ScriptTarget.ES2022 },
    "3.7.3",
    true,
    ts,
  );
  const system = createSystem(fsMap);
  const compilerOpts = {};
  const env = createVirtualTypeScriptEnvironment(system, [], ts, compilerOpts);
  const ata = setupTypeAcquisition(env);

  const path = "index.ts";

  const editor = new EditorView({
    doc: `let hasAnError: string = 10;

function increment(num: number) {
  return num + 1;
}

increment('not a number');`,
    extensions: [
      basicSetup,
      javascript({
        typescript: true,
        jsx: true,
      }),
      tsFacet.of({ env, path }),
      tsSync(),
      tsLinter(),

      EditorView.updateListener.of((update) => {
        ata.update(update.state.doc.toString(), "./index.ts");
      }),
      autocompletion({
        override: [tsAutocomplete()],
      }),
      tsHover(),
    ],
    parent: document.querySelector("#editor")!,
  });
})();
