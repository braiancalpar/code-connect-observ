const tracer = require("dd-trace");

console.log("iniciando tracer");

tracer.init({
  runtimeMetrics: true,
  logInjection: true,
});
console.log("tracer vai ser adicionado ao global");

global.__tracer__ = tracer;

console.log("tracer adicionado ao global", {
  tracerAvailable: !!global.__tracer__,
});

console.log("tracer iniciado");
