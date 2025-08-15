import { z } from "zod";

export const Oauth = z.object({
  type: z.literal("oauth"),
  refresh: z.string(),
  access: z.string(),
  expires: z.number(),
});

export const AuthInfo = z.discriminatedUnion("type", [Oauth]);
export type AuthInfo = z.infer<typeof AuthInfo>;

/**
 * Abstract storage interface for authentication data
 */
export interface AuthStorage {
  /**
   * Get authentication info for a provider
   */
  get(providerID: string): Promise<AuthInfo | undefined>;
  
  /**
   * Set authentication info for a provider
   */
  set(providerID: string, info: AuthInfo): Promise<void>;
}
