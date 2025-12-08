[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

# Solace TryMe CLI MCP Server

A Model Context Protocol (MCP) server that exposes Solace Try-Me CLI (STM) functionality to Large Language Models through CLI command wrapping.

## Overview

This proof of concept demonstrates how to integrate STM's event feed management capabilities with LLMs via the MCP protocol. The current implementation uses CLI command wrapping for rapid development, with a clear path to direct function integration in future iterations.

## Prerequisites

- Node.js 18+
- [Solace Try-Me CLI (STM)](https://github.com/SolaceLabs/solace-tryme-cli) v0.0.83 or later installed and available in PATH
- MCP Inspector for testing: Install globally with exact version
  ```bash
  yarn global add @modelcontextprotocol/inspector@0.1.0
  # Or using npm (if yarn not available)
  npm install -g @modelcontextprotocol/inspector@0.1.0
  ```

## Installation

```bash
# Clone the repository with submodules
git clone --recurse-submodules https://github.com/your-org/solace-tryme-agent.git
cd solace-tryme-agent

# Or if already cloned, initialize submodules
git submodule update --init --recursive

# Install dependencies
yarn install --frozen-lockfile

# Verify STM is available
stm --version
```

**Note**: This project includes the STM CLI source code as a git submodule (at `solace-tryme-cli/`) for reference purposes. The submodule is pinned to v0.0.83.

## Security Best Practices

When working with this repository, follow these security guidelines:

### Dependency Management
- This project uses Yarn with a lockfile (`yarn.lock`) for reproducible builds
- Always use `yarn install --frozen-lockfile` to install dependencies
- Never modify `yarn.lock` manually
- Check for vulnerabilities regularly: `yarn audit` or `npm audit`
- Check for outdated packages: `yarn outdated`

### Installation Safety
- All dependencies use exact version pinning (no ^ or ~ ranges)
- Lifecycle scripts are a potential security risk - audit dependencies before installing
- Never use `npx` to run tools - install globally with exact versions instead

### Adding New Dependencies
- Always specify exact versions: `yarn add package@1.2.3`
- Never use version ranges: ~~`yarn add package@^1.2.3`~~ ❌
- After adding packages, commit both `package.json` and `yarn.lock`
- Team members run `yarn install --frozen-lockfile` to get exact versions

### For Contributors
- Run `yarn audit` before submitting pull requests
- Do not commit secrets, API keys, or credentials to version control
- Keep dependencies up to date and address security advisories promptly
- Review the [OWASP NPM Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/NPM_Security_Cheat_Sheet.html)

## Available Tools

### 1. `stm_help`
Get help information about STM CLI commands.

**Parameters:**
- `command` (optional): Specific STM command to get help for

### 2. `stm_feed_list`
List available event feeds (local and community).

**Parameters:**
- `source` (optional): `"local"`, `"community"`, or `"both"` (default: `"local"`)

### 3. `stm_feed_generate`
Generate a new feed from an AsyncAPI document.

**Parameters:**
- `source` (required): File path or URL to AsyncAPI document
- `feed_name` (optional): Name for the generated feed

**Note**: Currently shows limitation message due to interactive CLI prompts in POC approach.

### 4. `stm_feed_run`
Run an event feed to publish messages to Solace broker.

**Parameters:**
- `feed_name` (required): Name of the feed to run
- `count` (optional): Number of events to publish (default: 1, 0 for continuous)
- `interval` (optional): Time between publishes in milliseconds (default: 1000)
- `event_names` (optional): Array of specific event names to publish

**Note**: Currently shows limitation message due to broker connection requirements and interactive prompts.

### 5. `stm_send`
Send/publish messages to Solace broker topics or queues.

**Parameters:**
- `topic` (string): Topic to publish to (mutually exclusive with queue)
- `queue` (string): Queue to publish to (mutually exclusive with topic)
- `message` (string): Message payload as string
- `message_file` (string): Path to file containing message payload
- `count` (number): Number of messages to send (default: 1, 0 for continuous)
- `interval` (number): Interval between messages in milliseconds (default: 1000)
- `url` (string): Broker URL (e.g., ws://localhost:8008)
- `vpn` (string): Message VPN name
- `username` (string): Client username
- `password` (string): Client password
- `delivery_mode` (string): DIRECT, PERSISTENT, or NON_PERSISTENT
- `time_to_live` (number): Message TTL in milliseconds
- `output_mode` (string): DEFAULT, COMPACT, or FULL (default: DEFAULT)
- `lint` (boolean): Validate parameters without executing (default: true)

### 6. `stm_receive`
Receive/consume messages from Solace broker topics or queues.

**Parameters:**
- `topic` (string): Topic to subscribe to (mutually exclusive with queue)
- `queue` (string): Queue to consume from (mutually exclusive with topic)
- `count` (number): Number of messages to receive (default: 1, 0 for continuous)
- `timeout` (number): Receive timeout in milliseconds (default: 60000)
- `url` (string): Broker URL
- `vpn` (string): Message VPN name
- `username` (string): Client username
- `password` (string): Client password
- `output_mode` (string): DEFAULT, COMPACT, or FULL (default: DEFAULT)
- `lint` (boolean): Validate parameters without executing (default: true)

### 7. `stm_request`
Send request messages and wait for replies (request-reply pattern).

**Parameters:**
- `topic` (string, required): Topic to send request to
- `message` (string): Request message payload
- `message_file` (string): Path to file containing request payload
- `count` (number): Number of requests to send (default: 1)
- `timeout` (number): Request timeout in milliseconds (default: 5000)
- `url` (string): Broker URL
- `vpn` (string): Message VPN name
- `username` (string): Client username
- `password` (string): Client password
- `output_mode` (string): DEFAULT, COMPACT, or FULL (default: DEFAULT)
- `lint` (boolean): Validate parameters without executing (default: true)

### 8. `stm_reply`
Listen for requests and send replies (request-reply pattern responder).

**Parameters:**
- `topic` (string, required): Topic to listen for requests on
- `message` (string): Reply message payload
- `message_file` (string): Path to file containing reply payload
- `count` (number): Number of requests to reply to (default: 1, 0 for continuous)
- `timeout` (number): Wait timeout in milliseconds (default: 60000)
- `url` (string): Broker URL
- `vpn` (string): Message VPN name
- `username` (string): Client username
- `password` (string): Client password
- `output_mode` (string): DEFAULT, COMPACT, or FULL (default: DEFAULT)
- `lint` (boolean): Validate parameters without executing (default: true)

**Note**: All messaging tools default to `lint: true` for safe parameter validation. Set to `false` to actually execute commands (requires broker connectivity).

## Manual Testing with MCP Inspector

The MCP Inspector provides an interactive web interface to test our MCP server tools. Here's how to test each feature:

### Setup MCP Inspector

1. **Start the MCP Server:**
```bash
# In the project directory
yarn start
```
The server will start and display: "Solace TryMe CLI MCP Server running on stdio"

2. **Start MCP Inspector in a new terminal:**
```bash
# Start the globally installed MCP Inspector
mcp-inspector node src/index.js

# Or if not in PATH, use yarn to run the installed version
yarn global run @modelcontextprotocol/inspector node src/index.js
```

⚠️ **Security Note**: Never use `npx` to run tools as it downloads and executes code without version pinning. Always install tools globally with specific versions.

3. **Open the Inspector:**
The inspector will open in your browser (typically http://localhost:3000)

### Test Cases

#### Test 1: STM Help Command
**Purpose**: Verify basic STM CLI integration works

1. In the MCP Inspector, select the `stm_help` tool
2. **Test basic help:**
   - Leave parameters empty
   - Click "Call Tool"
   - **Expected Result**: STM CLI help output with ASCII art banner and command list

3. **Test specific command help:**
   - Set `command` to `"feed"`
   - Click "Call Tool"
   - **Expected Result**: Detailed help for the `stm feed` command

#### Test 2: Feed Listing
**Purpose**: Test feed discovery and output formatting

1. Select the `stm_feed_list` tool

2. **Test local feeds:**
   - Set `source` to `"local"`
   - Click "Call Tool"
   - **Expected Result**:
   ```
   Found X local feed(s):

   1. **FeedName1** (asyncapi_feed)
   2. **FeedName2** (asyncapi_feed)
   ```

3. **Test default behavior:**
   - Leave `source` empty (defaults to local)
   - Click "Call Tool"
   - **Expected Result**: Same as local feeds test

4. **Test both feeds:**
   - Set `source` to `"both"`
   - Click "Call Tool"
   - **Expected Result**: Local feeds + note about community feeds being skipped

5. **Test community feeds (optional):**
   - Set `source` to `"community"`
   - Click "Call Tool"
   - **Expected Result**: Either community feeds list or timeout/error (network dependent)

#### Test 3: Feed Generation
**Purpose**: Test parameter validation and limitation documentation

1. Select the `stm_feed_generate` tool

2. **Test missing parameters:**
   - Leave all parameters empty
   - Click "Call Tool"
   - **Expected Result**: Error message about required `source` parameter

3. **Test with file path:**
   - Set `source` to `"test/sample-asyncapi.yaml"`
   - Leave `feed_name` empty
   - Click "Call Tool"
   - **Expected Result**: POC limitation message with explanation

4. **Test with feed name:**
   - Set `source` to `"test/sample-asyncapi.yaml"`
   - Set `feed_name` to `"MyTestFeed"`
   - Click "Call Tool"
   - **Expected Result**: POC limitation message including the feed name

5. **Test with non-existent file:**
   - Set `source` to `"/nonexistent/file.yaml"`
   - Click "Call Tool"
   - **Expected Result**: POC limitation message (file validation happens in STM CLI)

#### Test 4: Feed Execution
**Purpose**: Test feed execution and broker communication capabilities

1. Select the `stm_feed_run` tool

2. **Test missing feed name:**
   - Leave all parameters empty
   - Click "Call Tool"
   - **Expected Result**: Error message about required `feed_name` parameter

3. **Test with existing feed:**
   - Set `feed_name` to `"DynamicPricingEngine-0"` (or another feed from your list)
   - Set `count` to `1`
   - Click "Call Tool"
   - **Expected Result**: POC limitation message about broker connection requirements

4. **Test with custom parameters:**
   - Set `feed_name` to `"DynamicPricingEngine-0"`
   - Set `count` to `3`
   - Set `interval` to `500`
   - Click "Call Tool"
   - **Expected Result**: POC limitation message with custom parameters shown

5. **Test with non-existent feed:**
   - Set `feed_name` to `"NonExistentFeed"`
   - Click "Call Tool"
   - **Expected Result**: Clear error message that feed was not found

#### Test 5: End-to-End Workflow
**Purpose**: Test the complete workflow integration

1. Run the comprehensive test:
```bash
node test/end-to-end-test.js
```

2. **Expected workflow:**
   - Lists existing feeds ✅
   - Attempts feed generation 🚧 (shows limitation)
   - Verifies feed list unchanged ✅
   - Attempts feed execution 🚧 (shows limitation)
   - Provides comprehensive analysis ✅

### Expected Test Results Summary

| Test Case | Status | Expected Behavior |
|-----------|---------|------------------|
| `stm_help` (no params) | ✅ Working | STM help output with banner |
| `stm_help` (specific command) | ✅ Working | Command-specific help |
| `stm_feed_list` (local) | ✅ Working | Formatted list of local feeds |
| `stm_feed_list` (both) | ✅ Working | Local feeds + community note |
| `stm_feed_list` (community) | ⚠️  Network dependent | May timeout or succeed |
| `stm_feed_generate` (missing params) | ✅ Working | Clear error message |
| `stm_feed_generate` (valid params) | 🚧 POC Limitation | Informative limitation message |
| `stm_feed_run` (missing params) | ✅ Working | Clear error message |
| `stm_feed_run` (valid params) | 🚧 POC Limitation | Broker connection limitation message |
| `stm_feed_run` (invalid feed) | ✅ Working | Feed not found error |
| End-to-end workflow | ✅ POC Complete | Demonstrates integration + limitations |

### Troubleshooting

#### "STM CLI not found" Error
- Verify STM is installed: `stm --version`
- Check PATH includes STM installation directory
- On macOS with Homebrew: `brew install stm`

#### MCP Inspector Connection Issues
- Ensure the MCP server is running (`yarn start`)
- Check that no other process is using the stdio transport
- Try restarting both server and inspector

#### Tool Call Timeouts
- Some STM commands (especially community feeds) may be slow
- Default timeout is 30 seconds
- Network-dependent operations may fail in offline environments

#### Interactive Prompt Issues
- STM CLI commands with interactive prompts are not supported in POC
- These are documented as limitations in the tool responses
- Will be resolved in Phase 2 (direct integration)

## Development Testing

### Automated Tests
```bash
# Run all tests
yarn test

# Run specific test suites
node test/feed-list-test.js
node test/feed-generate-test.js
node test/mcp-test.js
```

### Manual CLI Testing
```bash
# Test STM CLI wrapper directly
node -e "
const { executeSTMCommand } = require('./src/stm-cli.js');
executeSTMCommand('--help').then(console.log);
"

# Test server instantiation
node -e "
const { STMServer } = require('./src/index.js');
const server = new STMServer();
console.log('Server created successfully');
"
```

## Current POC Status

### ✅ Working Features
- **Basic MCP Server**: Properly configured with stdio transport
- **STM CLI Integration**: Robust command execution with error handling
- **Feed Listing**: Local feeds discovery with formatted output
- **Parameter Validation**: Proper input validation and error messages
- **Documentation**: Clear limitation messaging for unsupported features

### 🚧 Known Limitations (POC)
- **Interactive Commands**: STM commands with prompts not supported via CLI wrapping
- **Community Feeds**: Network-dependent, may be slow or fail
- **Real-time Feedback**: No progress updates for long-running operations
- **Advanced Error Handling**: Basic CLI error parsing only

### 🎯 Next Steps (Phase 3+)
1. **Add `stm_feed_run` tool** - Execute feeds (if non-interactive)
2. **Implement MCP Resources** - Expose feed metadata as resources
3. **Enhanced Error Handling** - Better CLI output parsing
4. **Phase 2 Planning** - Direct STM function integration design

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   LLM Client    │    │   MCP Server    │    │   STM CLI       │
│   (Claude)      │◄──►│   (Node.js)     │◄──►│   (Installed)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                       │                       │
       │ MCP Protocol          │ Child Process         │ Solace Broker
       │ (JSON-RPC)            │ Execution             │ Connection
       │                       │                       │
   ┌─────────┐             ┌─────────┐             ┌─────────┐
   │ Natural │             │   CLI   │             │  Event  │
   │Language │             │Wrapper  │             │ Feeds   │
   │ Queries │             │ Layer   │             │ & Data  │
   └─────────┘             └─────────┘             └─────────┘
```

This POC demonstrates the feasibility of MCP integration with STM while identifying the clear benefits of direct function integration for future development.

## Resources

This is not an officially supported Solace product.

For more information try these resources:
- Ask the [Solace Community](https://solace.community)
- The Solace Developer Portal website at: https://solace.dev

## Contributing

Contributions are encouraged! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Authors

See the list of [contributors](https://github.com/SolaceLabs/solace-tryme-cli-mcp-server/graphs/contributors) who participated in this project.

## License

See the [LICENSE](LICENSE) file for details.