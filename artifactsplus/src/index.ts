#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { writeFile, access, mkdir, rename } from "fs/promises";
import { execa } from "execa";
import { Command } from "commander";
import { createNewArtifactFolder, setUpArtifactProject } from "./utils.js";
import path from "path";
import { installCommand } from "./install.js";

// Create server instance
const server = new Server(
  {
    name: "mcp-artifacts-plus",
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
          "Create a new artifact folder with an appropriate name. If the user creates an artifact folder, you should then write React artifacts using write-artifact-tsx rather than using antArtifact. It also runs the project & opens it in Cursor.",
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
  if (!process.env.PROJECTS_PATH) {
    throw new Error("PROJECTS_PATH environment variable is not set");
  }

  const { name, arguments: args } = request.params;

  try {
    if (name === "write-artifact-tsx") {
      const { content, project_name } = reactAppContentSchema.parse(args);
      if (!content) {
        throw new Error("No content provided to write");
      }
      // Create backup directory if it doesn't exist
      const backupDir = path.join(
        process.env.PROJECTS_PATH,
        `${project_name}/src/old_App`
      );
      try {
        await access(backupDir);
      } catch {
        await mkdir(backupDir);
      }

      // Generate unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      const tsxPath = path.join(
        process.env.PROJECTS_PATH,
        `${project_name}/src/App.tsx`
      );

      // Move existing file to backup location
      await rename(
        tsxPath,
        backupDir + "/App_replacedat_" + timestamp + ".tsx"
      );

      await writeFile(tsxPath, content, "utf8");
      const cursorPath = "/usr/local/bin/cursor";
      console.error(`Executing cursor from: ${cursorPath}`);

      try {
        await execa(cursorPath, ["."], {
          cwd: path.join(process.env.PROJECTS_PATH, `${project_name}`),
        });
      } catch (error) {
        console.error("Error running cursor:", error);
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote content to ${tsxPath}`,
          },
        ],
      };
    } else if (name === "create-new-react-artifact-folder") {
      const { project_name } = createNewArtifactFolderSchema.parse(args);
      const artifact_path = await createNewArtifactFolder(
        process.env.PROJECTS_PATH,
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

const createServer = async () => {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("new MCP server running on stdio");
  } catch (error) {
    console.error("Error creating server:", error);
  }
};
const runServer = new Command("serve").action(createServer);
const program = new Command();
program.addCommand(runServer);
program.addCommand(installCommand);
program.parse(process.argv);
