#!/usr/bin/env node

/**
 * Solace TryMe CLI MCP Server - Proof of Concept
 *
 * A Model Context Protocol server that wraps Solace Try-Me CLI (STM)
 * feed commands for integration with Large Language Models.
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const STM_TOOLS = [
  {
    name: 'stm_feed_list',
    description: 'List available STM event feeds with enhanced formatting and details',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['local', 'community', 'both'],
          default: 'local',
          description: 'Which feeds to list: local, community, or both'
        },
        detailed: {
          type: 'boolean',
          default: false,
          description: 'Show detailed information for each feed'
        }
      }
    }
  },
  {
    name: 'stm_asyncapi_analyze',
    description: 'Analyze AsyncAPI specification files to understand structure and generate feed insights',
    inputSchema: {
      type: 'object',
      properties: {
        asyncapi_file: {
          type: 'string',
          description: 'Path to AsyncAPI specification file (JSON or YAML)'
        },
        analysis_type: {
          type: 'string',
          enum: ['overview', 'channels', 'messages', 'schemas', 'feed_potential'],
          default: 'overview',
          description: 'Type of analysis to perform'
        }
      },
      required: ['asyncapi_file']
    }
  },
  {
    name: 'stm_feed_validate',
    description: 'Validate AsyncAPI specifications and check STM feed compatibility',
    inputSchema: {
      type: 'object',
      properties: {
        asyncapi_file: {
          type: 'string',
          description: 'Path to AsyncAPI specification file to validate'
        },
        validation_level: {
          type: 'string',
          enum: ['basic', 'stm_compatibility', 'comprehensive'],
          default: 'stm_compatibility',
          description: 'Level of validation to perform'
        }
      },
      required: ['asyncapi_file']
    }
  },
  {
    name: 'stm_feed_preview',
    description: 'Preview detailed information about a specific feed including events and schema',
    inputSchema: {
      type: 'object',
      properties: {
        feed_name: {
          type: 'string',
          description: 'Name of the feed to preview'
        },
        community_feed: {
          type: 'boolean',
          default: false,
          description: 'Whether this is a community feed'
        }
      },
      required: ['feed_name']
    }
  },
  {
    name: 'stm_feed_run',
    description: 'Run an event feed to publish messages to Solace broker. REQUIRED: feed_name and event_names must be provided. Use stm_feed_preview to discover available event names for a feed.',
    inputSchema: {
      type: 'object',
      properties: {
        feed_name: {
          type: 'string',
          description: 'Name of the feed to run (REQUIRED)'
        },
        event_names: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of event names to publish (REQUIRED). These are simple event names like "Loan_Applied", "Loan_Approved", etc. Use stm_feed_preview first to discover available event names for the feed.'
        },
        count: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Number of events to publish per event type (0 for continuous streaming)'
        },
        interval: {
          type: 'number',
          minimum: 0,
          default: 1000,
          description: 'Time between publishes in milliseconds'
        },
        initial_delay: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Initial delay before starting in milliseconds'
        },
        community_feed: {
          type: 'boolean',
          default: false,
          description: 'Whether this is a community feed'
        },
        url: {
          type: 'string',
          description: 'Broker URL (default: ws://localhost:8008)'
        },
        vpn: {
          type: 'string',
          description: 'Message VPN name (default: default)'
        },
        username: {
          type: 'string',
          description: 'Username for broker connection (default: default)'
        },
        password: {
          type: 'string',
          description: 'Password for broker connection (default: default)'
        },
        output_mode: {
          type: 'string',
          enum: ['DEFAULT', 'PROPS', 'FULL'],
          default: 'DEFAULT',
          description: 'Message output mode'
        },
        quiet: {
          type: 'boolean',
          default: true,
          description: 'Run in non-interactive mode with default settings'
        }
      },
      required: ['feed_name', 'event_names']
    }
  },
  {
    name: 'stm_config',
    description: 'View STM configuration or get guidance on initializing STM in your local environment',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'init'],
          description: 'Action to perform: "list" to view current config, "init" to get setup instructions'
        }
      },
      required: ['action']
    }
  },
  {
    name: 'stm_manage',
    description: 'Manage STM broker connections, queues, and resources',
    inputSchema: {
      type: 'object',
      properties: {
        resource: {
          type: 'string',
          enum: ['connection', 'semp-connection', 'queue', 'client-profile', 'acl-profile', 'client-username'],
          description: 'Resource type to manage'
        },
        operation: {
          type: 'string',
          enum: ['list', 'create', 'update', 'delete'],
          description: 'Operation to perform (list, create, update, delete)'
        },
        name: {
          type: 'string',
          description: 'Name of the resource (for create/update/delete operations, or to get details in list)'
        },
        url: {
          type: 'string',
          description: 'Broker URL (for connection resources)'
        },
        vpn: {
          type: 'string',
          description: 'Message VPN name'
        },
        username: {
          type: 'string',
          description: 'Username for authentication'
        },
        password: {
          type: 'string',
          description: 'Password for authentication'
        },
        semp_url: {
          type: 'string',
          description: 'SEMP URL (for SEMP operations)'
        },
        semp_vpn: {
          type: 'string',
          description: 'SEMP VPN name'
        },
        semp_username: {
          type: 'string',
          description: 'SEMP username'
        },
        semp_password: {
          type: 'string',
          description: 'SEMP password'
        },
        access_type: {
          type: 'string',
          description: 'Access type for queue (EXCLUSIVE or NON-EXCLUSIVE)'
        },
        add_subscriptions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic subscriptions to add to queue'
        },
        remove_subscriptions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic subscriptions to remove from queue'
        },
        list_subscriptions: {
          type: 'boolean',
          description: 'List subscriptions on queue'
        },
        client_profile: {
          type: 'string',
          description: 'Client profile name (for client-username)'
        },
        acl_profile: {
          type: 'string',
          description: 'ACL profile name (for client-username)'
        },
        enabled: {
          type: 'boolean',
          description: 'Enable/disable resource'
        },
        client_password: {
          type: 'string',
          description: 'Password for client username'
        }
      },
      required: ['resource', 'operation']
    }
  },
  {
    name: 'stm_feed_generate',
    description: 'Generate a new feed from an AsyncAPI document non-interactively using STM defaults',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'File path or URL to AsyncAPI document'
        },
        feed_name: {
          type: 'string',
          description: 'Name for the generated feed (optional)'
        },
        preview_only: {
          type: 'boolean',
          default: false,
          description: 'Only preview what would be generated without creating the feed'
        },
        validate_first: {
          type: 'boolean',
          default: true,
          description: 'Validate AsyncAPI spec before generation'
        }
      },
      required: ['source']
    }
  },
  {
    name: 'stm_feed_contribute',
    description: 'Contribute a feed to the STM community repository with proper validation and metadata',
    inputSchema: {
      type: 'object',
      properties: {
        feed_name: {
          type: 'string',
          description: 'Name of the local feed to contribute'
        },
        description: {
          type: 'string',
          description: 'Description of the feed and its use cases'
        },
        category: {
          type: 'string',
          enum: ['banking', 'retail', 'logistics', 'healthcare', 'automotive', 'iot', 'other'],
          description: 'Category/domain for the feed'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to help users discover the feed'
        },
        author: {
          type: 'string',
          description: 'Author name or organization'
        },
        dry_run: {
          type: 'boolean',
          default: true,
          description: 'Preview contribution without actually submitting'
        }
      },
      required: ['feed_name', 'description', 'category']
    }
  },
  {
    name: 'stm_help',
    description: 'Get help information about STM CLI commands',
    inputSchema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Specific STM command to get help for (optional)'
        }
      }
    }
  },
  {
    name: 'stm_send',
    description: 'Send/publish messages to Solace broker topics or queues with full parameter control (requires STM CLI v0.0.82+)',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Topic to publish to (mutually exclusive with queue)'
        },
        queue: {
          type: 'string',
          description: 'Queue to publish to (mutually exclusive with topic)'
        },
        message: {
          type: 'string',
          description: 'Message payload as string'
        },
        message_file: {
          type: 'string',
          description: 'Path to file containing message payload'
        },
        count: {
          type: 'number',
          minimum: 0,
          default: 1,
          description: 'Number of messages to send (0 for continuous)'
        },
        interval: {
          type: 'number',
          minimum: 0,
          default: 1000,
          description: 'Interval between messages in milliseconds'
        },
        url: {
          type: 'string',
          description: 'Broker URL (e.g., ws://localhost:8008, wss://host:443)'
        },
        vpn: {
          type: 'string',
          description: 'Message VPN name'
        },
        username: {
          type: 'string',
          description: 'Client username'
        },
        password: {
          type: 'string',
          description: 'Client password'
        },
        delivery_mode: {
          type: 'string',
          enum: ['DIRECT', 'PERSISTENT', 'NON_PERSISTENT'],
          description: 'Message delivery mode'
        },
        time_to_live: {
          type: 'number',
          minimum: 0,
          description: 'Message time-to-live in milliseconds'
        },
        output_mode: {
          type: 'string',
          enum: ['DEFAULT', 'COMPACT', 'FULL'],
          default: 'DEFAULT',
          description: 'Output verbosity level'
        },
        lint: {
          type: 'boolean',
          default: true,
          description: 'Validate parameters without executing (safer for LLMs)'
        }
      }
    }
  }
];

// Note: stm_receive, stm_request, and stm_reply have been intentionally removed.
// The Solace TryMe CLI MCP Server is not well suited for receiving events from the broker.
// Users who need to receive/subscribe to messages should use the STM CLI directly in their console:
//   - stm receive --topic "your/topic"
//   - stm request --topic "your/topic" --message "request"
//   - stm reply --topic "your/topic" --message "response"

class STMServer {
  constructor() {
    this.server = new Server(
      {
        name: 'stm-mcp-server',
        version: '0.1.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: STM_TOOLS
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'stm_help':
            return await this.handleSTMHelp(args);
          case 'stm_feed_list':
            return await this.handleFeedList(args);
          case 'stm_feed_preview':
            return await this.handleFeedPreview(args);
          case 'stm_feed_run':
            return await this.handleFeedRun(args);
          case 'stm_config':
            return await this.handleConfig(args);
          case 'stm_manage':
            return await this.handleManage(args);
          case 'stm_asyncapi_analyze':
            return await this.handleAsyncAPIAnalyze(args);
          case 'stm_feed_validate':
            return await this.handleFeedValidate(args);
          case 'stm_feed_generate':
            return await this.handleFeedGenerate(args);
          case 'stm_feed_contribute':
            return await this.handleFeedContribute(args);
          case 'stm_send':
            return await this.handleSend(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleSTMHelp(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const command = args.command ? `${args.command} --help` : '--help';

    const result = await executeSTMCommand(command);

    return {
      content: [
        {
          type: 'text',
          text: result.success ? result.output : `Error: ${result.error}`
        }
      ]
    };
  }

  async handleFeedList(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const source = args.source || 'local';
    const detailed = args.detailed || false;

    let command = 'feed list';

    // Map source parameter to STM CLI flags
    // Always use explicit flags to avoid interactive prompts
    if (source === 'local') {
      command += ' --local-only';
    } else if (source === 'community') {
      command += ' --community-only';
    } else if (source === 'both') {
      // For both, we'll make two separate calls and combine results
      return await this.handleBothFeeds(detailed);
    }

    const result = await executeSTMCommand(command);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing feeds: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Parse and format the output for better readability
    const output = await this.formatFeedListOutput(result.output, source, detailed);

    return {
      content: [
        {
          type: 'text',
          text: output
        }
      ]
    };
  }

  /**
   * Format the feed list output for better readability
   */
  async formatFeedListOutput(rawOutput, source, detailed = false) {
    const lines = rawOutput.split('\n');
    const feedLines = lines.filter(line =>
      line.includes('[asyncapi_feed]') ||
      line.includes('[openapi-feed]') ||
      line.includes('[restapi_feed]')
    );

    if (feedLines.length === 0) {
      return `📭 No ${source} feeds found.\n\n💡 **Tip**: Try generating feeds from AsyncAPI spec files using 'stm_feed_generate', or pull existing feeds from community feeds.`;
    }

    let formatted = `📋 **Available ${source.toUpperCase()} Feeds** (${feedLines.length} found):\n\n`;

    const feedDetails = [];

    for (let i = 0; i < feedLines.length; i++) {
      const line = feedLines[i];
      const match = line.match(/\[(.*?)\]\s+(.+)/);

      if (match) {
        const [, feedType, feedName] = match;
        const feedInfo = {
          index: i + 1,
          name: feedName.trim(),
          type: feedType,
          formatted: `${i + 1}. 🎯 **${feedName.trim()}** \`(${feedType})\``
        };

        if (detailed && source === 'local') {
          // For detailed view, try to get feed preview for local feeds
          try {
            const previewResult = await this.getFeedPreviewQuick(feedName.trim(), source === 'community');
            if (previewResult) {
              feedInfo.formatted += `\n   📊 ${previewResult.eventCount || 0} events available`;
              if (previewResult.description) {
                feedInfo.formatted += `\n   📝 ${previewResult.description.substring(0, 100)}${previewResult.description.length > 100 ? '...' : ''}`;
              }
            }
          } catch (error) {
            // Silently continue if preview fails
          }
        }

        feedDetails.push(feedInfo);
      } else {
        feedDetails.push({
          index: i + 1,
          name: line.trim(),
          type: 'unknown',
          formatted: `${i + 1}. ${line.trim()}`
        });
      }
    }

    formatted += feedDetails.map(feed => feed.formatted).join('\n\n');

    formatted += `\n\n💡 **Next Steps**:`;
    formatted += `\n• Use \`stm_feed_preview\` to see detailed information about a specific feed`;
    formatted += `\n• Use \`stm_feed_run\` to execute a feed and publish messages`;

    if (source === 'local' && feedDetails.length > 0) {
      formatted += `\n\n📌 **Example Usage**:`;
      const exampleFeed = feedDetails[0];
      formatted += `\n\`\`\`\nstm_feed_preview: {\n  "feed_name": "${exampleFeed.name}"\n}\n\`\`\``;
    }

    return formatted;
  }

  /**
   * Handle listing both local and community feeds by making separate calls
   */
  async handleBothFeeds(detailed = false) {
    try {
      // Get local feeds
      const localResult = await this.handleFeedList({ source: 'local', detailed });
      const localText = localResult.content[0].text;

      // Attempt to get community feeds with timeout
      let combinedText = localText;

      try {
        const { executeSTMCommand } = require('./stm-cli.js');
        const communityResult = await executeSTMCommand('feed list --community-only', { timeout: 15000 });

        if (communityResult.success) {
          const communityOutput = await this.formatFeedListOutput(communityResult.output, 'community', detailed);
          combinedText += `\n\n---\n\n${communityOutput}`;
        } else {
          combinedText += `\n\n---\n\n🌐 **COMMUNITY FEEDS**: ⚠️ Unable to fetch (network issue or timeout)`;
        }
      } catch (error) {
        combinedText += `\n\n---\n\n🌐 **COMMUNITY FEEDS**: ⚠️ ${error.message}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: combinedText
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing feeds: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle feed preview - show detailed information about a specific feed
   */
  async handleFeedPreview(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const { feed_name, community_feed = false } = args;

    if (!feed_name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: feed_name parameter is required'
          }
        ],
        isError: true
      };
    }

    let command = `feed preview --feed-name "${feed_name}"`;
    if (community_feed) {
      command += ' --community-feed';
    }

    const result = await executeSTMCommand(command, { timeout: 20000 });

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Error previewing feed "${feed_name}": ${result.error}`
          }
        ],
        isError: true
      };
    }

    const output = this.formatFeedPreviewOutput(result.output, feed_name, community_feed);

    return {
      content: [
        {
          type: 'text',
          text: output
        }
      ]
    };
  }

  /**
   * Get quick feed preview information (used for detailed listing)
   */
  async getFeedPreviewQuick(feedName, isCommunity = false) {
    try {
      const { executeSTMCommand } = require('./stm-cli.js');
      let command = `feed preview --feed-name "${feedName}"`;
      if (isCommunity) {
        command += ' --community-feed';
      }

      const result = await executeSTMCommand(command, { timeout: 10000 });
      if (!result.success) {
        return null;
      }

      // Extract basic information from preview output
      const output = result.output;
      const eventCount = (output.match(/Events?:/g) || []).length;
      const descMatch = output.match(/Description:\s*(.+)/);

      return {
        eventCount,
        description: descMatch ? descMatch[1] : null
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Handle STM configuration management
   */
  async handleConfig(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const { action } = args;

    if (!action) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: action parameter is required. Use "list" to view current config or "init" for setup instructions.'
          }
        ],
        isError: true
      };
    }

    try {
      switch (action) {
        case 'list':
          // Execute: stm config list (not stm config --list)
          const result = await executeSTMCommand('config list');

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error listing config: ${result.error}`
                }
              ],
              isError: true
            };
          }

          const output = this.formatConfigOutput(result.output, 'list');

          return {
            content: [
              {
                type: 'text',
                text: output
              }
            ]
          };

        case 'init':
          // Provide setup instructions and documentation link
          return {
            content: [{
              type: 'text',
              text: `⚙️ **STM Configuration Setup**\n\n` +
                    `Before using the Solace TryMe CLI MCP Server, you need to configure STM in your local environment.\n\n` +
                    `**To initialize STM configuration:**\n\n` +
                    `1. Run the following command in your terminal:\n` +
                    `   \`\`\`bash\n   stm config init\n   \`\`\`\n\n` +
                    `2. Follow the interactive prompts to configure:\n` +
                    `   - Broker URL\n` +
                    `   - VPN Name\n` +
                    `   - Username\n` +
                    `   - Password\n\n` +
                    `**Documentation:**\n` +
                    `For detailed setup instructions, visit:\n` +
                    `https://github.com/SolaceLabs/solace-tryme-cli?tab=readme-ov-file#setup-stm-configuration\n\n` +
                    `**Verify Configuration:**\n` +
                    `After setup, use \`stm_config\` with action "list" to verify your settings.`
            }]
          };

        default:
          return {
            content: [{
              type: 'text',
              text: `Error: Unknown action "${action}". Valid actions: "list" or "init"`
            }],
            isError: true
          };
      }

    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error handling config ${action}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * Handle STM resource management (connections, queues, profiles, etc.)
   */
  async handleManage(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const {
      resource, operation, name,
      url, vpn, username, password,
      semp_url, semp_vpn, semp_username, semp_password,
      access_type, add_subscriptions, remove_subscriptions, list_subscriptions,
      client_profile, acl_profile, enabled, client_password
    } = args;

    if (!resource || !operation) {
      return {
        content: [{
          type: 'text',
          text: 'Error: resource and operation parameters are required'
        }],
        isError: true
      };
    }

    try {
      // Build the command
      let command = `manage ${resource}`;

      // Add operation flag
      if (operation === 'list') {
        command += name ? ` --list ${name}` : ' --list';
      } else if (operation === 'create') {
        if (!name) {
          return {
            content: [{
              type: 'text',
              text: `Error: name is required for ${operation} operation`
            }],
            isError: true
          };
        }
        command += ` --create ${name}`;
      } else if (operation === 'update') {
        if (!name) {
          return {
            content: [{
              type: 'text',
              text: `Error: name is required for ${operation} operation`
            }],
            isError: true
          };
        }
        command += ` --update ${name}`;
      } else if (operation === 'delete') {
        if (!name) {
          return {
            content: [{
              type: 'text',
              text: `Error: name is required for ${operation} operation`
            }],
            isError: true
          };
        }
        command += ` --delete ${name}`;
      }

      // Add resource-specific parameters
      if (resource === 'connection') {
        if (url) command += ` --url "${url}"`;
        if (vpn) command += ` --vpn "${vpn}"`;
        if (username) command += ` --username "${username}"`;
        if (password) command += ` --password "${password}"`;
      } else if (resource === 'semp-connection') {
        if (semp_url) command += ` --semp-url "${semp_url}"`;
        if (semp_vpn) command += ` --semp-vpn "${semp_vpn}"`;
        if (semp_username) command += ` --semp-username "${semp_username}"`;
        if (semp_password) command += ` --semp-password "${semp_password}"`;
      } else if (resource === 'queue') {
        // SEMP connection params
        if (semp_url) command += ` --semp-url "${semp_url}"`;
        if (semp_vpn) command += ` --semp-vpn "${semp_vpn}"`;
        if (semp_username) command += ` --semp-username "${semp_username}"`;
        if (semp_password) command += ` --semp-password "${semp_password}"`;

        // Queue-specific params
        if (access_type) command += ` --access-type ${access_type}`;
        if (add_subscriptions && add_subscriptions.length > 0) {
          command += ` --add-subscriptions ${add_subscriptions.map(s => `"${s}"`).join(' ')}`;
        }
        if (remove_subscriptions && remove_subscriptions.length > 0) {
          command += ` --remove-subscriptions ${remove_subscriptions.map(s => `"${s}"`).join(' ')}`;
        }
        if (list_subscriptions) command += ` --list-subscriptions`;
      } else if (resource === 'client-username') {
        // SEMP connection params
        if (semp_url) command += ` --semp-url "${semp_url}"`;
        if (semp_vpn) command += ` --semp-vpn "${semp_vpn}"`;
        if (semp_username) command += ` --semp-username "${semp_username}"`;
        if (semp_password) command += ` --semp-password "${semp_password}"`;

        // Client username specific params
        if (client_profile) command += ` --client-profile "${client_profile}"`;
        if (acl_profile) command += ` --acl-profile "${acl_profile}"`;
        if (enabled !== undefined) command += ` --enabled ${enabled}`;
        if (client_password) command += ` --client-password "${client_password}"`;
      } else {
        // For client-profile and acl-profile
        if (semp_url) command += ` --semp-url "${semp_url}"`;
        if (semp_vpn) command += ` --semp-vpn "${semp_vpn}"`;
        if (semp_username) command += ` --semp-username "${semp_username}"`;
        if (semp_password) command += ` --semp-password "${semp_password}"`;
      }

      const result = await executeSTMCommand(command);

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `Error executing manage ${resource} ${operation}: ${result.error}`
          }],
          isError: true
        };
      }

      const output = this.formatManageOutput(result.output, resource, operation, name);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error handling manage ${resource} ${operation}: ${error.message}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handle AsyncAPI analysis - analyze AsyncAPI specs for feed generation insights
   */
  async handleAsyncAPIAnalyze(args) {
    const { asyncapi_file, analysis_type = 'overview' } = args;

    if (!asyncapi_file) {
      return {
        content: [{
          type: 'text',
          text: 'Error: asyncapi_file parameter is required'
        }],
        isError: true
      };
    }

    try {
      // Check if file exists
      const fs = require('fs');
      const path = require('path');

      let filePath = asyncapi_file;
      if (!path.isAbsolute(asyncapi_file)) {
        filePath = path.resolve(asyncapi_file);
      }

      if (!fs.existsSync(filePath)) {
        return {
          content: [{
            type: 'text',
            text: `Error: AsyncAPI file not found at path: ${filePath}`
          }],
          isError: true
        };
      }

      // Read and parse AsyncAPI file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      let asyncApiSpec;

      try {
        asyncApiSpec = JSON.parse(fileContent);
      } catch (jsonError) {
        return {
          content: [{
            type: 'text',
            text: `Error parsing AsyncAPI file as JSON: ${jsonError.message}\n\nNote: YAML support coming soon. Please use JSON format.`
          }],
          isError: true
        };
      }

      const output = this.formatAsyncAPIAnalysis(asyncApiSpec, analysis_type, filePath);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error analyzing AsyncAPI file: ${error.message}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handle AsyncAPI validation - validate specs and check STM compatibility
   */
  async handleFeedValidate(args) {
    const { asyncapi_file, validation_level = 'stm_compatibility' } = args;

    if (!asyncapi_file) {
      return {
        content: [{
          type: 'text',
          text: 'Error: asyncapi_file parameter is required'
        }],
        isError: true
      };
    }

    try {
      // First, analyze the file to get basic structure
      const analysisResult = await this.handleAsyncAPIAnalyze({
        asyncapi_file,
        analysis_type: 'feed_potential'
      });

      if (analysisResult.isError) {
        return analysisResult;
      }

      // Perform validation based on level
      const fs = require('fs');
      const path = require('path');
      const filePath = path.isAbsolute(asyncapi_file) ? asyncapi_file : path.resolve(asyncapi_file);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const asyncApiSpec = JSON.parse(fileContent);

      const output = this.formatFeedValidation(asyncApiSpec, validation_level, filePath);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error validating AsyncAPI file: ${error.message}`
        }],
        isError: true
      };
    }
  }

  /**
   * Handle feed contribution workflow
   */
  async handleFeedContribute(args) {
    const { feed_name, description, category, tags = [], author, dry_run = true } = args;

    if (!feed_name || !description || !category) {
      return {
        content: [{
          type: 'text',
          text: 'Error: feed_name, description, and category are required parameters'
        }],
        isError: true
      };
    }

    try {
      // First check if the feed exists locally
      const { executeSTMCommand } = require('./stm-cli.js');
      const listResult = await executeSTMCommand('feed list --local-only');

      if (!listResult.success || !listResult.output.includes(feed_name)) {
        return {
          content: [{
            type: 'text',
            text: `❌ **Feed Not Found**\n\nThe feed "${feed_name}" was not found in your local feeds.\n\n💡 **Available Actions:**\n1. Use \`stm_feed_list\` to see available local feeds\n2. Generate the feed first using \`stm_feed_generate\`\n3. Check the exact feed name spelling`
          }],
          isError: true
        };
      }

      const output = this.formatFeedContribution(
        feed_name,
        description,
        category,
        tags,
        author,
        dry_run
      );

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error processing feed contribution: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async handleFeedGenerate(args) {
    const { source, feed_name, preview_only = false, validate_first = true } = args;

    if (!source) {
      return {
        content: [{
          type: 'text',
          text: 'Error: source parameter is required (file path or URL to AsyncAPI document)'
        }],
        isError: true
      };
    }

    try {
      // Step 1: Validate the AsyncAPI file first if requested
      if (validate_first) {
        const validationResult = await this.handleFeedValidate({
          asyncapi_file: source,
          validation_level: 'stm_compatibility'
        });

        if (validationResult.isError) {
          return {
            content: [{
              type: 'text',
              text: `❌ **Feed Generation Failed - Validation Error**\n\n${validationResult.content[0].text}\n\n💡 **Tip**: Use \`stm_asyncapi_analyze\` to understand the file structure first.`
            }],
            isError: true
          };
        }
      }

      // Step 2: If preview only, show what would be generated
      if (preview_only) {
        const analysisResult = await this.handleAsyncAPIAnalyze({
          asyncapi_file: source,
          analysis_type: 'feed_potential'
        });

        return {
          content: [{
            type: 'text',
            text: `🔮 **Feed Generation Preview**\n\n**Source**: \`${source}\`\n${feed_name ? `**Feed Name**: ${feed_name}\n` : ''}\n${analysisResult.content[0].text}\n\n📢 **To actually generate**: Set \`preview_only: false\``
          }]
        };
      }

      // Step 3: Attempt actual generation using non-interactive mode
      const { executeSTMCommand } = require('./stm-cli.js');
      let command = `feed generate --feed-type "asyncapi" --file-name "${source}" --use-defaults`;

      if (feed_name) {
        command += ` --feed-name "${feed_name}"`;
      }

      // Execute the command with non-interactive flags
      const result = await executeSTMCommand(command, { timeout: 30000 });

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `Error generating feed: ${result.error}\n\n📝 **Command executed**: \`stm ${command}\`\n\n💡 **Tip**: Ensure the AsyncAPI file is valid and STM CLI is properly configured.`
          }],
          isError: true
        };
      }

      // Success! Format the output
      const output = this.formatFeedGenerationResult(result.output, source, feed_name);

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error in feed generation process: ${error.message}`
        }],
        isError: true
      };
    }
  }

  async handleFeedRun(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const {
      feed_name,
      count = 0,
      interval = 1000,
      initial_delay = 0,
      event_names,
      community_feed = false,
      url,
      vpn,
      username,
      password,
      output_mode = 'DEFAULT',
      quiet = true
    } = args;

    if (!feed_name) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: feed_name parameter is required'
          }
        ],
        isError: true
      };
    }

    if (!event_names || event_names.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ **Missing Required Parameter: event_names**

**Issue**: The \`event_names\` parameter is required to run a feed non-interactively.

**Solution**: Use \`stm_feed_preview\` first to discover available event names for the "${feed_name}" feed.

**Example workflow**:
1. Call \`stm_feed_preview\` with \`feed_name: "${feed_name}"\`
2. Review the list of available events
3. Call \`stm_feed_run\` with the desired event names

**Format**: Provide event names as simple strings like:
\`["Loan_Applied", "Loan_Approved"]\`

**Note**: The \`stm_feed_preview\` output will show available event names.`
          }
        ],
        isError: true
      };
    }

    let command = 'feed run';

    // Add required feed name
    command += ` --feed-name "${feed_name}"`;

    // Add community feed flag if specified
    if (community_feed) {
      command += ' --community-feed';
    }

    // Add event names as space-separated quoted values (as per STM CLI specification)
    // The CLI expects: --event-names "Event1" "Event2" "Event3"
    command += ` --event-names ${event_names.map(e => `"${e}"`).join(' ')}`;

    // Add count parameter
    command += ` --count ${count}`;

    // Add interval parameter
    command += ` --interval ${interval}`;

    // Add initial delay parameter if specified
    if (initial_delay > 0) {
      command += ` --initial-delay ${initial_delay}`;
    }

    // Add connection parameters if provided
    if (url) command += ` --url "${url}"`;
    if (vpn) command += ` --vpn "${vpn}"`;
    if (username) command += ` --username "${username}"`;
    if (password) command += ` --password "${password}"`;

    // Add output mode if not default
    if (output_mode !== 'DEFAULT') {
      command += ` --output-mode ${output_mode}`;
    }

    // Add quiet flag for non-interactive mode
    if (quiet) {
      command += ' --quiet';
    }

    // Calculate appropriate timeout based on operation
    // For continuous mode (count=0), use a short timeout and expect it to be killed
    // For finite counts, calculate based on expected duration
    let timeout;
    if (count === 0) {
      // Continuous mode - shouldn't be used in MCP, but if it is, use short timeout
      timeout = 15000; // 15 seconds max
    } else {
      // Calculate expected duration: count * interval * event_names + buffer
      const expectedDuration = (count * interval * event_names.length) / 1000; // in seconds
      timeout = Math.max(60000, expectedDuration * 1000 + 30000); // At least 60s, or expected + 30s buffer
    }

    const options = {
      timeout,
      killSignal: 'SIGTERM' // Ensure clean termination
    };

    const result = await executeSTMCommand(command, options);

    if (!result.success) {
      // Check if it's an interactive prompt issue
      if (result.error && (result.error.includes('?') || result.error.includes('Pick') || result.error.includes('Enter'))) {
        return {
          content: [
            {
              type: 'text',
              text: `🚧 **Feed Run - Interactive Prompt Detected**

**Request**: Run feed "${feed_name}" with events: ${event_names.join(', ')}

**Issue**: The STM CLI is prompting for additional input, which cannot be handled in CLI wrapping mode.

**Possible reasons**:
- Feed requires broker connection configuration
- Missing or invalid feed configuration
- Interactive prompts for missing parameters

**Workaround**: Use STM CLI directly: \`stm ${command}\`

**Error Output**:
\`\`\`
${result.error.substring(0, 500)}${result.error.length > 500 ? '...' : ''}
\`\`\``
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `Error running feed: ${result.error}`
          }
        ],
        isError: true
      };
    }

    // Parse and format the run result
    const output = this.formatFeedRunOutput(result.output, feed_name, count, event_names);

    return {
      content: [
        {
          type: 'text',
          text: output
        }
      ]
    };
  }

  /**
   * Format the feed run output
   */
  formatFeedRunOutput(rawOutput, feedName, count, eventNames) {
    const lines = rawOutput.split('\n');

    // Look for success indicators
    const publishedLines = lines.filter(line =>
      line.includes('published') ||
      line.includes('sent') ||
      line.includes('success')
    );

    if (publishedLines.length > 0) {
      return `✅ **Feed "${feedName}" executed successfully!**

**Events**: ${eventNames.join(', ')}
**Messages Published**: ${count === 0 ? 'Continuous (stopped after timeout)' : count + ' per event type'}

**Results**:
${publishedLines.map(line => `- ${line.trim()}`).join('\n')}

**Full Output**:
\`\`\`
${rawOutput}
\`\`\``;
    } else {
      return `📊 **Feed "${feedName}" execution completed**

**Events**: ${eventNames.join(', ')}
**Details**:
\`\`\`
${rawOutput}
\`\`\``;
    }
  }

  /**
   * Format the feed generation output
   */
  formatFeedGenerateOutput(rawOutput) {
    // Look for success indicators in the output
    if (rawOutput.includes('success')) {
      return `✅ Feed generated successfully!\n\n${rawOutput}`;
    } else if (rawOutput.includes('error') || rawOutput.includes('Error')) {
      return `❌ Feed generation failed:\n\n${rawOutput}`;
    } else {
      return rawOutput;
    }
  }

  /**
   * Format the feed preview output
   */
  formatFeedPreviewOutput(rawOutput, feedName, isCommunity = false) {
    const lines = rawOutput.split('\n');
    let formatted = `🎯 **Feed Preview: ${feedName}** ${isCommunity ? '(Community Feed)' : '(Local Feed)'}\n\n`;

    // Look for key sections in the output
    const eventLines = lines.filter(line => line.includes('Events:') || line.includes('Event:'));
    const descriptionLines = lines.filter(line => line.includes('Description:'));
    const schemaLines = lines.filter(line => line.includes('Schema:') || line.includes('Properties:'));

    if (descriptionLines.length > 0) {
      formatted += `📝 **Description**:\n`;
      descriptionLines.forEach(line => {
        const desc = line.replace(/Description:\s*/, '').trim();
        if (desc) formatted += `${desc}\n\n`;
      });
    }

    if (eventLines.length > 0) {
      formatted += `🎪 **Available Events** (${eventLines.length}):\n`;
      eventLines.forEach((line, index) => {
        const eventInfo = line.replace(/Events?:\s*/, '').trim();
        if (eventInfo) formatted += `${index + 1}. ${eventInfo}\n`;
      });
      formatted += '\n';
    }

    // Extract event names for feed run usage (new simple format)
    // Look for patterns like "Event_Name      topic/path" and extract just the event name
    const eventNameMatches = rawOutput.match(/\"([^\"]+?)\s{2,}([^\"]+)\"/g);
    let simpleEventNames = [];

    if (eventNameMatches && eventNameMatches.length > 0) {
      formatted += `🔧 **Event Names for stm_feed_run**:\n`;
      eventNameMatches.forEach((match, index) => {
        // Extract just the event name (before the spaces and topic)
        const eventNameOnly = match.replace(/^"/, '').replace(/"$/, '').split(/\s{2,}/)[0];
        simpleEventNames.push(eventNameOnly);
        formatted += `${index + 1}. \`${eventNameOnly}\`\n`;
      });
      formatted += '\n';
    }

    if (schemaLines.length > 0) {
      formatted += `📊 **Schema Information**:\n`;
      schemaLines.forEach(line => {
        const schema = line.replace(/Schema:\s*/, '').trim();
        if (schema) formatted += `${schema}\n`;
      });
      formatted += '\n';
    }

    // Add usage example with simple event names
    formatted += `💡 **Usage Example**:\n`;
    const exampleEventNames = simpleEventNames.length > 0
      ? `"${simpleEventNames[0]}"${simpleEventNames.length > 1 ? `, "${simpleEventNames[1]}"` : ''}`
      : '';
    formatted += `\`\`\`json\n{\n  \"tool\": \"stm_feed_run\",\n  \"arguments\": {\n    \"feed_name\": \"${feedName}\",\n    \"count\": 5,\n    \"interval\": 1000${isCommunity ? ',\n    \"community_feed\": true' : ''}${exampleEventNames ? ',\n    \"event_names\": [' + exampleEventNames + ']' : ''}\n  }\n}\n\`\`\``;

    // Add raw output for troubleshooting
    formatted += `\n\n📋 **Raw Output** (for troubleshooting):\n\`\`\`\n${rawOutput}\n\`\`\``;

    return formatted;
  }

  /**
   * Format the configuration output
   */
  formatConfigOutput(rawOutput, action) {
    let formatted = '';

    switch (action) {
      case 'list':
        formatted = `⚙️ **STM Configuration Settings**\n\n`;
        if (rawOutput.includes('No configuration') || rawOutput.trim().length === 0) {
          formatted += `📝 No configuration found.\n\n`;
          formatted += `💡 **Next Steps**: Use \`stm_config\` with action \"init\" to set up STM configuration.\n\n`;
          formatted += `📚 **Documentation**: https://github.com/SolaceLabs/solace-tryme-cli?tab=readme-ov-file#setup-stm-configuration`;
        } else {
          formatted += `\`\`\`\n${rawOutput}\n\`\`\`\n\n`;
          formatted += `✅ **Status**: Configuration is active and ready for use.`;
        }
        break;

      default:
        formatted = `⚙️ **STM Configuration**\n\n\`\`\`\n${rawOutput}\n\`\`\``;
    }

    return formatted;
  }

  /**
   * Format manage command output
   */
  formatManageOutput(rawOutput, resource, operation, name) {
    const resourceLabel = resource.replace('-', ' ').toUpperCase();
    let formatted = '';

    switch (operation) {
      case 'list':
        formatted = `📋 **${resourceLabel}${name ? ` - ${name}` : 's'}**\n\n`;
        formatted += `\`\`\`\n${rawOutput}\n\`\`\``;
        break;

      case 'create':
        formatted = `✅ **${resourceLabel} Created: ${name}**\n\n`;
        formatted += `\`\`\`\n${rawOutput}\n\`\`\`\n\n`;
        formatted += `💡 **Tip**: Use \`stm_manage\` with operation "list" to verify the resource was created.`;
        break;

      case 'update':
        formatted = `✅ **${resourceLabel} Updated: ${name}**\n\n`;
        formatted += `\`\`\`\n${rawOutput}\n\`\`\``;
        break;

      case 'delete':
        formatted = `✅ **${resourceLabel} Deleted: ${name}**\n\n`;
        formatted += `\`\`\`\n${rawOutput}\n\`\`\``;
        break;

      default:
        formatted = `⚙️ **${resourceLabel} - ${operation}**\n\n\`\`\`\n${rawOutput}\n\`\`\``;
    }

    return formatted;
  }

  /**
   * Format AsyncAPI analysis output
   */
  formatAsyncAPIAnalysis(asyncApiSpec, analysisType, filePath) {
    try {
      const info = asyncApiSpec.info || {};
      const channels = asyncApiSpec.channels || {};
      const messages = asyncApiSpec.components?.messages || {};
      const schemas = asyncApiSpec.components?.schemas || {};

    let formatted = `📋 **AsyncAPI Analysis: ${info.title || 'Unknown'}**\n\n`;
    formatted += `📁 **Source**: \`${filePath}\`\n`;
    formatted += `📊 **Version**: AsyncAPI ${asyncApiSpec.asyncapi} / App ${info.version}\n`;

    if (info.description) {
      formatted += `📝 **Description**: ${info.description}\n`;
    }

    formatted += `\n`;

    switch (analysisType) {
      case 'overview':
        formatted += `🔍 **Overview Analysis**:\n\n`;
        formatted += `• **Channels**: ${Object.keys(channels).length}\n`;
        formatted += `• **Messages**: ${Object.keys(messages).length}\n`;
        formatted += `• **Schemas**: ${Object.keys(schemas).length}\n`;
        break;

      case 'channels':
        formatted += `📡 **Channels Analysis** (${Object.keys(channels).length} found):\n\n`;
        Object.entries(channels).forEach(([channelPath, channelDef], index) => {
          formatted += `${index + 1}. **${channelPath}**\n`;
          const operations = [];
          if (channelDef.publish) operations.push('publish');
          if (channelDef.subscribe) operations.push('subscribe');
          if (channelDef.messages) operations.push('messages');
          formatted += `   Operations: ${operations.join(', ') || 'none'}\n`;

          const params = channelDef.parameters || {};
          if (Object.keys(params).length > 0) {
            formatted += `   Parameters: {${Object.keys(params).join(', ')}}\n`;
          }
          formatted += `\n`;
        });
        break;

      case 'messages':
        formatted += `💬 **Messages Analysis** (${Object.keys(messages).length} found):\n\n`;
        Object.entries(messages).forEach(([msgName, msgDef], index) => {
          formatted += `${index + 1}. **${msgName}**\n`;
          if (msgDef.description) {
            formatted += `   Description: ${msgDef.description}\n`;
          }
          if (msgDef.contentType) {
            formatted += `   Content-Type: ${msgDef.contentType}\n`;
          }
          formatted += `\n`;
        });
        break;

      case 'schemas':
        formatted += `🏗️ **Schemas Analysis** (${Object.keys(schemas).length} found):\n\n`;
        Object.entries(schemas).forEach(([schemaName, schemaDef], index) => {
          formatted += `${index + 1}. **${schemaName}**\n`;
          if (schemaDef.description) {
            formatted += `   Description: ${schemaDef.description}\n`;
          }
          if (schemaDef.properties) {
            const propCount = Object.keys(schemaDef.properties).length;
            formatted += `   Properties: ${propCount} fields\n`;
            if (schemaDef.required) {
              formatted += `   Required: ${schemaDef.required.length} fields\n`;
            }
          }
          formatted += `\n`;
        });
        break;

      case 'feed_potential':
        formatted += `🎯 **Feed Generation Potential**:\n\n`;

        // Handle different AsyncAPI versions (2.x vs 3.x)
        let publishableEvents = [];
        let subscribableEvents = [];

        if (asyncApiSpec.asyncapi.startsWith('3.')) {
          // AsyncAPI 3.x format - use operations
          const operations = asyncApiSpec.operations || {};
          Object.entries(operations).forEach(([opName, opDef]) => {
            if (opDef.action === 'send') {
              publishableEvents.push({ name: opName, definition: opDef });
            } else if (opDef.action === 'receive') {
              subscribableEvents.push({ name: opName, definition: opDef });
            }
          });
        } else {
          // AsyncAPI 2.x format - use channel operations
          Object.entries(channels).forEach(([channelPath, channelDef]) => {
            if (channelDef.publish) {
              publishableEvents.push({ name: channelPath, definition: channelDef });
            }
            if (channelDef.subscribe) {
              subscribableEvents.push({ name: channelPath, definition: channelDef });
            }
            if (channelDef.messages) {
              publishableEvents.push({ name: channelPath, definition: channelDef });
            }
          });
        }

        formatted += `📤 **Publishable Events**: ${publishableEvents.length}\n`;
        formatted += `📥 **Subscribable Events**: ${subscribableEvents.length}\n\n`;

        if (publishableEvents.length > 0) {
          formatted += `✅ **Recommended for Feed Generation**\n\n`;
          formatted += `**Event Names for stm_feed_run**:\n`;
          publishableEvents.slice(0, 3).forEach((event) => {
            let eventName = 'publish.message';
            let channelPath = event.name;

            if (asyncApiSpec.asyncapi.startsWith('3.')) {
              // For AsyncAPI 3.x, extract from operation
              const channelRef = event.definition.channel?.$ref;
              if (channelRef) {
                channelPath = channelRef.replace('#/channels/', '').replace(/~1/g, '/');
              }
            } else {
              // For AsyncAPI 2.x, extract message name
              let msgRef = 'publish.message';
              if (event.definition.publish?.message?.$ref) {
                msgRef = event.definition.publish.message.$ref;
              } else if (event.definition.messages && typeof event.definition.messages === 'object') {
                const messageKeys = Object.keys(event.definition.messages);
                if (messageKeys.length > 0) {
                  msgRef = messageKeys[0];
                }
              }
              eventName = msgRef.includes('#/') ? msgRef.split('/').pop() : msgRef;
            }

            formatted += `• \`"${eventName}      ${channelPath}"\`\n`;
          });
          if (publishableEvents.length > 3) {
            formatted += `• ... and ${publishableEvents.length - 3} more\n`;
          }
        } else {
          formatted += `⚠️ **Limited Feed Potential** - Few publishable events found\n`;
        }
        break;
    }

    formatted += `\n💡 **Next Steps**:\n`;
    formatted += `• Use \`stm_feed_validate\` to check STM compatibility\n`;
    formatted += `• Use \`stm_feed_generate\` to create a feed from this spec\n`;
    formatted += `• Use \`preview_only: true\` to preview generation without creating\n`;

    return formatted;
    } catch (error) {
      console.error('[ERROR] formatAsyncAPIAnalysis:', error);
      return `Error formatting AsyncAPI analysis: ${error.message}`;
    }
  }

  /**
   * Format feed validation output
   */
  formatFeedValidation(asyncApiSpec, validationLevel, filePath) {
    let formatted = `🔍 **STM Feed Validation**\n\n`;
    formatted += `📁 **Source**: \`${filePath}\`\n`;
    formatted += `🎯 **Level**: ${validationLevel}\n\n`;

    const issues = [];
    const warnings = [];
    const successes = [];

    // Basic AsyncAPI structure validation
    if (!asyncApiSpec.asyncapi) {
      issues.push('Missing AsyncAPI version field');
    } else {
      successes.push(`Valid AsyncAPI version: ${asyncApiSpec.asyncapi}`);
    }

    if (!asyncApiSpec.info?.title) {
      issues.push('Missing application title in info section');
    } else {
      successes.push(`Application title: ${asyncApiSpec.info.title}`);
    }

    // STM-specific validation
    if (validationLevel === 'stm_compatibility' || validationLevel === 'comprehensive') {
      const channels = asyncApiSpec.channels || {};
      const channelCount = Object.keys(channels).length;

      if (channelCount === 0) {
        issues.push('No channels defined - STM feeds require at least one channel');
      } else {
        successes.push(`Found ${channelCount} channels for potential events`);
      }

      // Check for parameterized topics
      const parameterizedChannels = Object.keys(channels).filter(ch => ch.includes('{') && ch.includes('}'));
      if (parameterizedChannels.length > 0) {
        successes.push(`${parameterizedChannels.length} channels use parameterized topics (good for dynamic data)`);
      }

      // Check for Solace bindings
      const solaceBindings = Object.values(channels).some(ch =>
        ch.publish?.bindings?.solace || ch.subscribe?.bindings?.solace
      );
      if (solaceBindings) {
        successes.push('Contains Solace-specific bindings');
      } else {
        warnings.push('No Solace bindings found - may need manual configuration');
      }

      // Check message schemas
      const messages = asyncApiSpec.components?.messages || {};
      if (Object.keys(messages).length === 0) {
        warnings.push('No message schemas defined - feeds will generate basic data');
      } else {
        successes.push(`${Object.keys(messages).length} message schemas available for realistic data generation`);
      }
    }

    // Format results
    if (issues.length > 0) {
      formatted += `❌ **Issues Found** (${issues.length}):\n`;
      issues.forEach(issue => formatted += `• ${issue}\n`);
      formatted += `\n`;
    }

    if (warnings.length > 0) {
      formatted += `⚠️ **Warnings** (${warnings.length}):\n`;
      warnings.forEach(warning => formatted += `• ${warning}\n`);
      formatted += `\n`;
    }

    if (successes.length > 0) {
      formatted += `✅ **Validation Passed** (${successes.length}):\n`;
      successes.forEach(success => formatted += `• ${success}\n`);
      formatted += `\n`;
    }

    // Overall recommendation
    if (issues.length === 0) {
      formatted += `🎯 **Overall**: ${issues.length === 0 && warnings.length === 0 ? 'Excellent' : 'Good'} STM compatibility\n\n`;
      formatted += `💡 **Ready for**: \`stm_feed_generate\` with this specification\n`;
    } else {
      formatted += `⚠️ **Overall**: Needs attention before feed generation\n\n`;
      formatted += `🔧 **Fix issues first**, then try \`stm_feed_generate\`\n`;
    }

    return formatted;
  }

  /**
   * Format feed contribution workflow output
   */
  formatFeedContribution(feedName, description, category, tags, author, dryRun) {
    let formatted = `🤝 **STM Feed Contribution Workflow**\n\n`;

    if (dryRun) {
      formatted += `🔍 **DRY RUN MODE** - Preview only, no actual submission\n\n`;
    }

    formatted += `📋 **Feed Details**:\n`;
    formatted += `• **Name**: ${feedName}\n`;
    formatted += `• **Category**: ${category}\n`;
    formatted += `• **Description**: ${description}\n`;

    if (author) {
      formatted += `• **Author**: ${author}\n`;
    }

    if (tags && tags.length > 0) {
      formatted += `• **Tags**: ${tags.join(', ')}\n`;
    }

    formatted += `\n🔄 **Contribution Process**:\n\n`;

    if (dryRun) {
      formatted += `**This would happen in a real contribution:**\n\n`;
    }

    formatted += `1. ✅ **Validate Feed**: Check feed exists locally\n`;
    formatted += `2. 🔍 **Quality Check**: Validate feed structure and data\n`;
    formatted += `3. 📝 **Generate Metadata**: Create contribution metadata file\n`;
    formatted += `4. 📦 **Package Feed**: Bundle feed with documentation\n`;
    formatted += `5. 🚀 **Submit**: Upload to community repository\n`;
    formatted += `6. ✉️ **Notify**: Create pull request for review\n\n`;

    if (dryRun) {
      formatted += `⚠️ **To actually contribute**: Set \`dry_run: false\`\n\n`;
      formatted += `🚨 **Note**: Real contribution functionality is not yet implemented in this POC.\n`;
      formatted += `This would require integration with GitHub API and community repository access.\n\n`;
    }

    formatted += `💡 **Manual Alternative**:\n`;
    formatted += `1. Export your feed: Check \`~/.stm/feeds/\` directory\n`;
    formatted += `2. Visit: [STM Community Feeds Repository](https://github.com/SolaceLabs/solace-tryme-cli)\n`;
    formatted += `3. Follow the contribution guidelines in the repository\n\n`;

    formatted += `🎯 **Feed Contribution Best Practices**:\n`;
    formatted += `• Clear, descriptive names and descriptions\n`;
    formatted += `• Proper categorization for discoverability\n`;
    formatted += `• Realistic sample data that demonstrates use cases\n`;
    formatted += `• Complete documentation with usage examples\n`;

    return formatted;
  }

  /**
   * Format feed generation result output
   */
  formatFeedGenerationResult(rawOutput, source, feedName) {
    let formatted = `🎉 **Feed Generation Completed!**\n\n`;

    formatted += `📁 **Source**: \`${source}\`\n`;
    if (feedName) {
      formatted += `🎯 **Feed Name**: ${feedName}\n`;
    }
    formatted += `\n`;

    // Look for success indicators
    if (rawOutput.includes('success') || rawOutput.includes('generated')) {
      formatted += `✅ **Status**: Successfully generated\n\n`;
    } else {
      formatted += `📊 **Status**: Generation completed\n\n`;
    }

    formatted += `🔍 **Next Steps**:\n`;
    formatted += `1. Use \`stm_feed_list\` to see your new feed\n`;
    formatted += `2. Use \`stm_feed_preview\` to examine feed details\n`;
    formatted += `3. Use \`stm_feed_run\` to test the feed\n`;
    formatted += `4. Consider \`stm_feed_contribute\` to share with the community\n\n`;

    formatted += `📋 **Generation Output**:\n`;
    formatted += `\`\`\`\n${rawOutput}\n\`\`\`\n`;

    return formatted;
  }

  async handleSend(args) {
    const { executeSTMCommand } = require('./stm-cli.js');
    const { topic, queue, message, message_file, count = 1, interval = 1000,
            url, vpn, username, password, delivery_mode, time_to_live,
            output_mode = 'DEFAULT', lint = true } = args;

    // Validate topic/queue exclusivity
    if (topic && queue) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Cannot specify both topic and queue. Use one or the other.'
        }],
        isError: true
      };
    }

    if (!topic && !queue) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Must specify either topic or queue.'
        }],
        isError: true
      };
    }

    // Build command
    let command = 'send';

    if (topic) command += ` --topic "${topic}"`;
    if (queue) command += ` --queue "${queue}"`;
    if (message) command += ` --message "${message.replace(/"/g, '\\"')}"`;
    if (message_file) command += ` --message-file "${message_file}"`;
    if (count !== 1) command += ` --count ${count}`;
    if (interval !== 1000) command += ` --interval ${interval}`;
    if (url) command += ` --url "${url}"`;
    if (vpn) command += ` --vpn "${vpn}"`;
    if (username) command += ` --username "${username}"`;
    if (password) command += ` --password "${password}"`;
    if (delivery_mode) command += ` --delivery-mode ${delivery_mode}`;
    if (time_to_live) command += ` --time-to-live ${time_to_live}`;
    if (output_mode !== 'DEFAULT') command += ` --output-mode ${output_mode}`;

    const result = await executeSTMCommand(command, { lint });

    return {
      content: [{
        type: 'text',
        text: result.success ?
          `✅ Send command ${lint ? 'validated' : 'executed'} successfully:\n\n${result.output}` :
          `❌ Error: ${result.error}`
      }],
      isError: !result.success
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Solace TryMe CLI MCP Server running on stdio');
  }
}

// Start the server if this is the main module
if (require.main === module) {
  const server = new STMServer();
  server.run().catch(console.error);
}

module.exports = { STMServer };