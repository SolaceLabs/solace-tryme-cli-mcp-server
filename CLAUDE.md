# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Solace TryMe CLI MCP Server**, a Proof of Concept that exposes Solace Try-Me CLI (STM) functionality to Large Language Models via the Model Context Protocol. The implementation uses CLI command wrapping for rapid development, with a documented path to direct function integration for production use.

## Commands

### Development
- `npm start` - Start the MCP server (runs on stdio transport)
- `npm test` - Run the main test suite
- `node test/feed-list-test.js` - Test feed listing functionality
- `node test/feed-generate-test.js` - Test feed generation functionality
- `node test/messaging-tools-test.js` - Test messaging tools (send/receive/request/reply)
- `node test/mcp-test.js` - Test MCP server startup

### Manual Testing with MCP Inspector
```bash
# Terminal 1: Start MCP server
npm start

# Terminal 2: Start MCP Inspector
npx @modelcontextprotocol/inspector node src/index.js
```

### STM CLI Testing (requires STM installed)
- `stm --version` - Verify STM CLI is available
- `stm feed list --local-only` - Test basic STM functionality
- `stm feed --help` - Check available feed commands

## Architecture

### Core Components

**MCP Server** (`src/index.js`):
- Implements MCP protocol with stdio transport
- Defines 8 tools: `stm_help`, `stm_feed_list`, `stm_feed_generate`, `stm_send`, `stm_receive`, `stm_request`, `stm_reply`, plus additional feed management tools
- Each tool has input schema validation and proper error handling
- Tool handlers delegate to STM CLI wrapper for execution

**STM CLI Wrapper** (`src/stm-cli.js`):
- Abstracts STM CLI command execution via `child_process`
- Provides `executeSTMCommand(command, options)` function
- Handles command sanitization, timeouts, and error parsing
- Supports `--lint` flag for parameter validation without execution
- Supports `--quiet` flag for non-interactive execution
- Configuration: 30s timeout, 1MB buffer, shell injection protection

**Key Integration Pattern**:
```javascript
// MCP Tool Handler Pattern
async handleToolName(args) {
  const { executeSTMCommand } = require('./stm-cli.js');
  const result = await executeSTMCommand('stm-command --flags');
  return formatMCPResponse(result);
}
```

### Tool Implementations

**`stm_feed_list`**: ✅ **Working**
- Maps MCP `source` parameter to STM CLI flags (`--local-only`, `--community-only`)
- Parses STM output and formats as readable feed list
- Avoids interactive prompts by using explicit flags

**`stm_feed_generate`**: ✅ **Working Non-Interactively**
- Uses `--feed-type "STM"` and `--use-defaults` flags for automated generation
- Supports preview mode and validation before generation
- Generates feeds from AsyncAPI specifications without user interaction

**`stm_help`**: ✅ **Working**
- Simple passthrough to STM CLI help system
- Supports both general and command-specific help

**`stm_send`**: ✅ **Working** (requires STM CLI v0.0.83+)
- Send/publish messages to topics or queues
- Validates topic/queue exclusivity
- Defaults to `--lint` mode for safe parameter validation
- Full parameter support (URL, VPN, credentials, delivery mode, TTL)

**`stm_receive`**: ✅ **Working** (requires STM CLI v0.0.83+)
- Receive/consume messages from topics or queues
- Validates topic/queue exclusivity
- Defaults to `--lint` mode for safe parameter validation
- Configurable count and timeout

**`stm_request`**: ✅ **Working** (requires STM CLI v0.0.83+)
- Send request and wait for reply (request-reply pattern)
- Requires topic parameter
- Defaults to `--lint` mode for safe parameter validation
- Configurable request timeout

**`stm_reply`**: ✅ **Working** (requires STM CLI v0.0.83+)
- Listen for requests and send replies (request-reply responder)
- Requires topic parameter
- Defaults to `--lint` mode for safe parameter validation
- Supports continuous mode

### Known Limitations (POC)

**Interactive CLI Commands**: Most STM commands now work non-interactively using appropriate flags. Feed generation uses `--use-defaults` and configuration commands provide manual setup guidance.

**Network Dependencies**: Community feed operations depend on external network access and may timeout.

**Error Context**: Limited error details from CLI output parsing vs direct function access.

## Testing Strategy

### Test Structure
- `test/test.js` - Comprehensive test suite (7 tests covering CLI integration, server startup, command sanitization)
- `test/feed-*-test.js` - Individual feed tool testing with real STM CLI calls
- `test/messaging-tools-test.js` - Messaging tools testing (send/receive/request/reply) in lint mode
- `test/mcp-test.js` - MCP server startup verification
- `test/sample-asyncapi.yaml` - Sample AsyncAPI document for testing

### Prerequisites for Testing
- STM CLI must be installed and available in PATH
- Node.js 18+ required
- MCP Inspector for manual testing: `npm install -g @modelcontextprotocol/inspector`

## Future Development Path

**Phase 2 (Direct Integration)**: Replace CLI wrapping with direct STM TypeScript module imports to:
- Eliminate interactive prompt limitations
- Provide real-time progress feedback
- Access detailed error objects
- Support all STM functionality programmatically

**Phase 3 (Production Features)**: Add comprehensive input validation, caching, security hardening, and full test coverage.

## File Organization

```
src/
├── index.js          # MCP server implementation
└── stm-cli.js        # STM CLI wrapper utilities

test/
├── test.js           # Main test suite
├── *-test.js         # Individual component tests
├── sample-asyncapi.yaml  # Test fixtures
└── asyncSamples/     # Additional test data

solace-tryme-cli/         # STM source code reference (git submodule, v0.0.83)
STM_MCP_SERVER_IMPLEMENTATION_PLAN.md  # Detailed implementation plan
README.md             # Comprehensive manual testing guide
```

**Note**: The `solace-tryme-cli/` directory is a git submodule pointing to the official STM CLI repository, pinned to v0.0.83.

The codebase prioritizes clarity and rapid prototyping over optimization, making it easy to understand and extend while demonstrating MCP integration patterns.

## Commit Message Guidelines

**Important**: Do NOT include "Co-Authored-By: Claude" in commit messages. User preference is to exclude AI attribution from git history.