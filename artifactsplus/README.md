# 🚀 MCP Artifacts Plus

> A fun way to turn your Claude conversations into React projects! ✨

This MCP server lets Claude create new React projects on your machine. It puts the projects in an environment with all of the dependencies that Claude accesses when it generates artifacts.

## 🎮 Show Me!

It works just like telling Claude to create a React artifact. If Claude forgets to use the tools from this server, you can remind it to by saying something like "use mcp-artifacts-plus."

Claude will first use the `create-new-react-artifact-folder` tool to initialize the project and open the project in Cursor if you have it installed (if you request, I can also add the option to open the projects in VS Code or other IDEs). It will then write the artifact to that project using the `write-artifact-tsx` tool. When it does this, it moves the existing `App.tsx` file to a folder called `old_App`. You can run the project using `bun run dev` or `npm run dev`.

## Setup with Claude Desktop

1. Install bun if you haven't already.
2. Run `npx mcp-artifacts-plus install` and enter the path where you want Claude to store React projects when prompted.

Disclaimer: This MCP server modifies your filesystem. Also, it has only been tested on macOS. It would probably work on Windows as well after some simple modifications (in particular, to path formations).

## Contributing

Please feel free to open new issues or PRs!

## License

ISC License - Go forth and build amazing things!
