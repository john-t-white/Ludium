import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server be reached from other devices on the LAN (e.g. a
  // phone) for real-device testing — without this, Next.js's dev-mode
  // cross-origin protection silently breaks client hydration for requests
  // that don't come from localhost. Wildcarded so it isn't tied to one
  // developer's current DHCP-assigned IP.
  allowedDevOrigins: ["192.168.0.*"],
};

export default nextConfig;
