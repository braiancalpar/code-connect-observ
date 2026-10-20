import { createLogger, format, transports } from "winston";
import Transport from "winston-transport";

const tracer = global.__tracer__;

function getTraceContext() {
  if (!tracer) {
    return {};
  }

  const span = tracer.scope().active();

  if (!span) {
    return {};
  }

  const context = span.context();

  return {
    "dd.trace_id": context.toTraceId(),
    "dd.span_id": context.toSpanId(),
  };
}

class DatadogTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
    this.apiKey = opts.apiKey || process.env.DD_API_KEY;
    this.site = opts.site || "datadoghq.com";
  }

  async log(info, callback) {
    if (!this.apiKey) {
      callback();
      return;
    }

    try {
      const body = JSON.stringify({
        ...info,
        ddsource: "nodejs",
        ddtags: `env:${info.environment},service:${info.service}`,
      });

      await fetch(`https://http-intake.logs.${this.site}/api/v2/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.apiKey,
        },
        body,
      });
    } catch (error) {
      console.error("Erro ao enviar log para Datadog:", error.message);
    }

    callback();
  }
}

const loggerTransports = [new transports.Console()];

if (process.env.DD_API_KEY) {
  loggerTransports.push(new DatadogTransport());
}

const logger = createLogger({
  level: process.env.LOG_LEVEL | "info",
  format: format.combine(
    format.timestamp("YYYY-MM-DDTHH:mm:ss.sssZ"),
    format.errors({ stack: true }),
    format.json(),
    format((info) => {
      return {
        ...info,
        ...getTraceContext(),
      };
    })(),
  ),
  defaultMeta: {
    service: "code-connect",
    env: process.env.NODE_ENV | "development",
  },
  transports: loggerTransports,
});

export default logger;
