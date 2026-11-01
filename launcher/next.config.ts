import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@prototype-lab/registry"],
  // ws optional native addons must resolve through Node, not empty webpack shims.
  serverExternalPackages: ["ws"]
};

export default nextConfig;
