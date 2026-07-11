// Default Expo Metro config, plus an exclusion for the Rust backend's build
// output so Metro never crawls or bundles anything under backend/target.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const backendTarget = path.resolve(__dirname, "backend/target");
config.resolver.blockList = [
  new RegExp(`^${backendTarget.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*`),
];

module.exports = config;
