import { execa } from "execa";
import { execSync } from "child_process";
import path from "path";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import fetch from "node-fetch";
import { Extract } from "unzip-stream";
import fs from "fs";

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

export async function createNewArtifactFolder(
  parent_directory: string,
  name: string
): Promise<string | false> {
  const fullPath = path.join(parent_directory, name);

  if (existsSync(fullPath)) {
    return false;
  }

  await mkdir(fullPath);
  return fullPath;
}

export async function setUpArtifactProject(
  artifact_path: string
): Promise<string> {
  const zipUrl =
    "https://github.com/jwaldor/mcp-artifacts-plus/archive/refs/heads/main.zip";
  const response = await fetch(zipUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }

  const temp_path = path.join(artifact_path);

  // Create directory
  await fs.promises.mkdir(temp_path, { recursive: true });

  // Download and extract only the React folder
  await new Promise((resolve, reject) => {
    (response.body as NodeJS.ReadableStream)
      .pipe(
        Extract({
          path: temp_path,
        })
      )
      .on("entry", (entry) => {
        if (!entry.path.startsWith("mcp-artifacts-plus-main/React/")) {
          entry.autodrain();
        }
      })
      .on("error", reject)
      .on("finish", resolve);
  });

  // Move contents from nested React folder to temp_path
  const reactPath = path.join(temp_path, "mcp-artifacts-plus-main/React");
  await fs.promises.cp(reactPath, temp_path, { recursive: true });
  await execa("bun", ["install"], { cwd: artifact_path });

  // Clean up the extra directory
  // await fs.promises.rm(path.join(temp_path, "mcp-artifacts-plus-main"), {
  //   recursive: true,
  // });

  return artifact_path;
}
