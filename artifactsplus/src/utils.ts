import { execSync } from "child_process";

export function analyzeImports(fileContent: string): {
  importLines: string[];
  uiComponents: string[];
} {
  // Split content into lines
  const lines = fileContent.split("\n");

  // Find consecutive import lines
  let n = 0;
  while (n < lines.length && lines[n].trim().startsWith("import")) {
    n++;
  }

  // Extract import lines
  const importLines = lines.slice(0, n);

  // Find UI components using regex
  const regex = /@['"]*components\/ui\/([^'"]+)/g;
  const matches = fileContent.matchAll(regex);
  const uiComponents = [...matches].map((match) => match[1]);

  return {
    importLines,
    uiComponents,
  };
}

export function installUIComponents(
  target_directory: string,
  uiComponents: string[]
): { components: string[]; output: string; error?: string } {
  const componentsString = uiComponents.join(" ");
  const output = execSync(`npx shadcn@latest add ${componentsString}`, {
    cwd: target_directory,
    encoding: "utf-8",
  });
  return { components: uiComponents, output };
}
