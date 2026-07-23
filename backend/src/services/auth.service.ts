import { getServiceRoleClient, getSupabaseClient } from "../shared/supabase-client.js";
import express from "express";

export class AuthService {
  /**
   * Generates the OAuth authentication URL for a given provider (Google or Facebook)
   * using Supabase Auth client or custom OAuth configuration.
   */
  async getOAuthUrl(provider: "google" | "facebook", reqRedirectUrl?: string) {
    const supabase = getServiceRoleClient();
    const fallbackRedirect = process.env.OAUTH_REDIRECT_URL || "http://localhost:5173";
    const redirectTo = reqRedirectUrl || fallbackRedirect;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: provider === "google" ? {
          access_type: "offline",
          prompt: "consent"
        } : undefined
      }
    });

    if (error) {
      throw new Error(`Failed to generate ${provider} OAuth URL: ${error.message}`);
    }

    return {
      provider,
      url: data.url,
      redirectTo
    };
  }

  /**
   * Syncs user profile metadata into Supabase 'profiles' table after social login/signup.
   */
  async syncUserProfile(userId: string, profileData: { full_name?: string; avatar_url?: string; email?: string; role?: string }) {
    const supabase = getServiceRoleClient();

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      // Create new profile record for social signup
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: profileData.full_name || profileData.email?.split("@")[0] || "User",
        avatar_url: profileData.avatar_url || "",
        role: profileData.role || "client",
        updated_at: new Date().toISOString()
      });

      if (insertError) {
        console.warn(`[AuthService] Profile insert notice for user ${userId}:`, insertError.message);
      }
    } else if (profileData.full_name || profileData.avatar_url) {
      // Update missing fields
      const { error: updateError } = await supabase.from("profiles").update({
        full_name: existingProfile.full_name || profileData.full_name,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString()
      }).eq("id", userId);

      if (updateError) {
        console.warn(`[AuthService] Profile update notice for user ${userId}:`, updateError.message);
      }
    }

    return { success: true, userId };
  }
}
