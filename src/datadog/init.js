import { datadogRum } from "@datadog/browser-rum";
import { reactPlugin } from "@datadog/browser-rum-react";
import { datadogLogs } from "@datadog/browser-logs";

let isInitialized = false;

export function initDatadog() {
  if (typeof window == "undefined") {
    return;
  }

  if (isInitialized) {
    return;
  }

  isInitialized = true;
  console.log("init");
  datadogRum.init({
    applicationId: "e48e1f4b-cc77-4cc6-9686-6a8cf3511ca8",
    clientToken: "pubc8a60c46c942ed77bafe0461462ace95",
    site: "datadoghq.com",
    service: "code-connect",
    env: "development", // e.g. 'prod', 'staging-1', 'dev'
    version: "1.0.0",
    sessionSampleRate: 100, // capture 100% of sessions
    sessionReplaySampleRate: 20, // capture 20% of sessions with replay
    trackResources: true, // Enable Resource tracking
    trackUserInteractions: true, // Enable Action tracking
    trackLongTasks: true, // Enable Long Tasks tracking

    // ----- Recommended Options -----
    // allowedTracingUrls: '<BACKEND_URL>',		// Enable distributed tracing
    defaultPrivacyLevel: "mask-user-input", // 'mask-user-input' | 'allow' | 'mask'
    plugins: [reactPlugin({ router: false })],
  });

  datadogLogs.init({
    clientToken: "pubc8a60c46c942ed77bafe0461462ace95",
    // `site` refers to the Datadog site parameter of your organization
    // see https://docs.datadoghq.com/getting_started/site/
    site: "datadoghq.com",
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
    forwardConsoleLogs: "all",
  });

  datadogRum.startSessionReplayRecording();
}
