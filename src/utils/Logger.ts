import chalk, { type ChalkInstance } from 'chalk';

interface LogData {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMetadata(metadata: Record<string, unknown>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ');
  }

  private logWithLevel(
    level: string,
    chalkColor: ChalkInstance,
    data: LogData
  ): void {
    const timestamp = this.getTimestamp();
    const context = data.context ? ` [${data.context}]` : '';
    const metadata = data.metadata ? ` | ${this.formatMetadata(data.metadata)}` : '';

    // Format the log prefix
    const prefix = chalkColor(`[${level}]`);
    const timestampStr = chalk.gray(`[${timestamp}]`);
    
    // Format the message
    const message = chalkColor(data.message);

    // Additional details (if any)
    const details = Object.entries(data)
      .filter(([key]) => !['message', 'context', 'metadata'].includes(key))
      .map(([key, value]) => `\n  ${chalk.gray(key)}: ${JSON.stringify(value)}`)
      .join('');

    console.log(
      `${prefix} ${timestampStr}${context} ${message}${metadata}${details}`
    );
  }

  info(data: LogData): void {
    this.logWithLevel('INFO', chalk.blue, data);
  }

  warn(data: LogData): void {
    this.logWithLevel('WARN', chalk.yellow, data);
  }

  error(data: LogData): void {
    this.logWithLevel('ERROR', chalk.red, data);
  }

  success(data: LogData): void {
    this.logWithLevel('SUCCESS', chalk.green, data);
  }

  debug(data: LogData): void {
    this.logWithLevel('DEBUG', chalk.magenta, data);
  }
}

export default Logger;