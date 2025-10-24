/**
 * STM CLI Wrapper
 *
 * Handles execution of STM CLI commands via child_process
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Configuration
const STM_COMMAND = 'stm';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB

/**
 * Execute an STM CLI command
 * @param {string} command - The STM command to execute (without 'stm' prefix)
 * @param {Object} options - Execution options
 * @param {boolean} options.lint - Use --lint flag for parameter validation without execution
 * @param {boolean} options.quiet - Use --quiet flag for non-interactive execution
 * @returns {Promise<Object>} Result object with success, output, and error fields
 */
async function executeSTMCommand(command, options = {}) {
  const {
    timeout = DEFAULT_TIMEOUT,
    cwd = process.cwd(),
    maxBuffer = MAX_BUFFER_SIZE,
    lint = false,
    quiet = false,
    killSignal = 'SIGTERM'
  } = options;

  // Sanitize and build the full command
  let sanitizedCommand = sanitizeCommand(command);

  // Add lint flag if requested (for parameter validation without execution)
  if (lint && !sanitizedCommand.includes('--lint')) {
    sanitizedCommand += ' --lint';
  }

  // Add quiet flag if requested (for non-interactive execution)
  if (quiet && !sanitizedCommand.includes('--quiet')) {
    sanitizedCommand += ' --quiet';
  }

  const fullCommand = `${STM_COMMAND} ${sanitizedCommand}`;

  console.error(`[STM-CLI] Executing: ${fullCommand}`);

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout,
      cwd,
      maxBuffer,
      killSignal,
      env: { ...process.env }
    });

    // STM may output to stderr for informational messages
    const output = stdout.trim();
    const errorOutput = stderr.trim();

    console.error(`[STM-CLI] Success. Output length: ${output.length}, Error length: ${errorOutput.length}`);

    return {
      success: true,
      output: output,
      error: errorOutput
    };

  } catch (error) {
    console.error(`[STM-CLI] Error executing command: ${error.message}`);

    // Check for specific error types
    if (error.code === 'ENOENT') {
      return {
        success: false,
        error: 'STM CLI not found. Please ensure STM is installed and in your PATH.'
      };
    }

    if (error.signal === 'SIGTERM') {
      return {
        success: false,
        error: `Command timed out after ${timeout}ms`
      };
    }

    // Return the error output if available, otherwise the error message
    return {
      success: false,
      error: error.stderr || error.stdout || error.message
    };
  }
}

/**
 * Sanitize command input to prevent shell injection
 * @param {string} command - The command to sanitize
 * @returns {string} Sanitized command
 */
function sanitizeCommand(command) {
  if (typeof command !== 'string') {
    throw new Error('Command must be a string');
  }

  // Basic sanitization - remove dangerous characters
  // For POC, we'll do basic escaping. Full implementation would be more thorough
  // Note: Preserve curly braces {} as they are legitimate in STM topic templates
  return command
    .replace(/[;&|`$()[\]<>]/g, '') // Remove shell metacharacters (but keep {})
    .trim();
}

/**
 * Check if STM CLI is available
 * @returns {Promise<boolean>} True if STM is available
 */
async function isSTMAvailable() {
  try {
    const result = await executeSTMCommand('--version', { timeout: 5000 });
    return result.success;
  } catch (error) {
    return false;
  }
}

/**
 * Get STM version information
 * @returns {Promise<Object>} Version information
 */
async function getSTMVersion() {
  const result = await executeSTMCommand('--version');
  return {
    available: result.success,
    version: result.success ? result.output : null,
    error: result.success ? null : result.error
  };
}

module.exports = {
  executeSTMCommand,
  isSTMAvailable,
  getSTMVersion,
  sanitizeCommand
};