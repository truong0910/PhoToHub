import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * GET /api/v1/auth/google
   * Redirects user or returns URL for Google OAuth Login/Signup
   */
  public handleGoogleLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectParam = req.query.redirect_to as string | undefined;
      const result = await this.authService.getOAuthUrl("google", redirectParam);

      // If requested via JSON API query `json=true`, return JSON, otherwise redirect
      if (req.query.json === "true") {
        res.status(200).json({ success: true, ...result });
        return;
      }

      res.redirect(result.url);
    } catch (error: any) {
      console.error("[AuthController] Google Login Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to initiate Google OAuth login."
      });
    }
  };

  /**
   * GET /api/v1/auth/facebook
   * Redirects user or returns URL for Facebook OAuth Login/Signup
   */
  public handleFacebookLogin = async (req: Request, res: Response): Promise<void> => {
    try {
      const redirectParam = req.query.redirect_to as string | undefined;
      const result = await this.authService.getOAuthUrl("facebook", redirectParam);

      if (req.query.json === "true") {
        res.status(200).json({ success: true, ...result });
        return;
      }

      res.redirect(result.url);
    } catch (error: any) {
      console.error("[AuthController] Facebook Login Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to initiate Facebook OAuth login."
      });
    }
  };

  /**
   * POST /api/v1/auth/social-sync
   * Called by frontend after user signs in via Google / Facebook to sync user profile.
   */
  public handleSocialSync = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, full_name, avatar_url, email, role } = req.body;

      if (!userId) {
        res.status(400).json({ success: false, error: "Missing required 'userId' field." });
        return;
      }

      const result = await this.authService.syncUserProfile(userId, {
        full_name,
        avatar_url,
        email,
        role
      });

      res.status(200).json({ success: true, message: "User profile synced successfully.", data: result });
    } catch (error: any) {
      console.error("[AuthController] Social Sync Error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to sync social user profile."
      });
    }
  };
}
