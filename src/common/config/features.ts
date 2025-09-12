// Simple feature flag configuration
// GPT-5 is enabled for all clients by default, but can be overridden via env

export interface FeatureFlags {
  gpt5Enabled: boolean;
}

export const getFeatureFlags = (): FeatureFlags => {
  const env = (process.env.ENABLE_GPT5 || "").toLowerCase();
  const gpt5Enabled = env === "false" || env === "0" ? false : true;

  return { gpt5Enabled };
};
