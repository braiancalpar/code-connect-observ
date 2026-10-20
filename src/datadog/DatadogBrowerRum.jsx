"use client";

import { useEffect } from "react";
import { initDatadog } from "./init";

export function DatadogBrowerRum() {
  useEffect(() => {
    initDatadog();
  }, []);

  return <></>;
}
