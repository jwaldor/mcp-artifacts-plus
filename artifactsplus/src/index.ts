import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readdir, writeFile, access, mkdir, rename } from "fs/promises";
import { join } from "path";
// import { analyzeImports, installUIComponents } from "./utils.js";
import { execa } from "execa";
import { createNewArtifactFolder, setUpArtifactProject } from "./utils.js";

// Create server instance
const server = new Server(
  {
    name: "artifactsplus",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const reactAppContentSchema = z.object({
  project_name: z.string(),
  content: z.string(),
});

const createNewArtifactFolderSchema = z.object({
  project_name: z.string(),
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list-directory",
        description: "List contents of the current directory",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "write-artifact-tsx",
        description:
          "Write content to the App.tsx file of an artifact project.",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Content to write to the TSX file",
            },
            project_name: {
              type: "string",
              description: "Name of the project to write to",
            },
          },
          required: ["content", "project_name"],
        },
      },
      {
        name: "create-new-react-artifact-folder",
        description:
          "Create a new artifact folder with an appropriate name. If the user creates an artifact folder, you should then write React artifacts using write-artifact-tsx rather than using antArtifact",
        inputSchema: {
          type: "object",
          properties: {
            project_name: {
              type: "string",
              description:
                "Name of folder that contains the new artifact project",
            },
          },
          required: ["project_name"],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "list-directory") {
      const files = await readdir(process.cwd());
      const fileList = files.join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Contents of current directory:\n\n${fileList}`,
          },
        ],
      };
    } else if (name === "write-artifact-tsx") {
      const { content, project_name } = reactAppContentSchema.parse(args);
      if (!content) {
        throw new Error("No content provided to write");
      }
      // Create backup directory if it doesn't exist
      const backupDir = `/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/artifacts_store/${project_name}/src/old_App`;
      try {
        await access(backupDir);
      } catch {
        await mkdir(backupDir);
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      const tsxPath = `/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/artifacts_store/${project_name}/src/App.tsx`;

      // Move existing file to backup location
      await rename(
        tsxPath,
        backupDir + "/App_replacedat_" + timestamp + ".tsx"
      );

      // Write new content

      // const extractedComponents = analyzeImports(content);
      // const { components, output } = installUIComponents(
      //   "/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/React",
      //   extractedComponents.uiComponents
      // );

      await writeFile(tsxPath, content, "utf8");
      const cursorPath = "/usr/local/bin/cursor";
      console.error(`Executing cursor from: ${cursorPath}`);

      const { stdout, stderr } = await execa(cursorPath, ["."], {
        cwd: `/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/artifacts_store/${project_name}`,
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote content to ${tsxPath} and ran cursor\nOutput: ${stdout}`,
          },
        ],
      };
    } else if (name === "create-new-react-artifact-folder") {
      const { project_name } = createNewArtifactFolderSchema.parse(args);
      const artifact_path = await createNewArtifactFolder(
        "/Users/jacobwaldor/FractalBootcamp/ClaudeEnvironment/artifacts_store",
        project_name
      );
      if (!artifact_path) {
        return {
          content: [
            {
              type: "text",
              text: `A project with name ${project_name} already exists. Choose a different name.`,
            },
          ],
        };
      }
      await setUpArtifactProject(artifact_path);

      return {
        content: [
          {
            type: "text",
            text: `Created new artifact folder: ${artifact_path}`,
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Directory Lister MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
