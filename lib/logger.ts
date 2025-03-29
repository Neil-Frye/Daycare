import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// Configure Pino options
const pinoOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'), // Default level based on environment
  // Base context to include in all logs (optional)
  base: {
    // pid: process.pid, // Process ID can be useful
    // hostname: os.hostname(), // Hostname can be useful in distributed systems
    // You can add other static context here if needed
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime, // ISO 8601 format
};

// Use pino-pretty for development, standard JSON for production
const transport = isProduction
  ? undefined // Use default stdout transport for production (JSON)
  : {
      target: 'pino-pretty',
      options: {
        colorize: true, // Enable colorized output
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // Human-readable timestamp format
        ignore: 'pid,hostname', // Don't show pid/hostname in pretty print
        // You can customize pino-pretty further here
      },
    };

// Create the logger instance
const logger = pino(pinoOptions, transport ? pino.transport(transport) : undefined);

export default logger;
