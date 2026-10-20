import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

const tracer = global.__tracer__;

const dbWithTracing = db.$extends({
  query: {
    $allOperations({ operation, model, args, query }) {
      if (!tracer || !tracer.wrap) {
        logger.warn("Tracer não disponível para o prisma");
        return query(args);
      }

      const spanName = `prisma.${operation}`;

      const wrappedQuery = tracer.wrap(
        spanName,
        {
          resource: spanName,
          type: "sql",
          tags: {
            "span.kind": "client",
            "db.type": "postgresql",
            "prisma.operation": operation,
            "prisma.model": model || "N/A",
          },
        },
        () => query(args),
      );

      return wrappedQuery();
    },
  },
});

export default dbWithTracing;
