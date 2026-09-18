import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: ["@avrash/content-schema", "@avrash/content-data"],
    poweredByHeader: false,
};

export default nextConfig;
