import { createClient, SupabaseClient } from "@supabase/supabase-js";
import express from "express";
import WebSocket from "ws";

// Polyfill globalThis.WebSocket for Node.js environments < 22 where native WebSocket is missing
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as any).WebSocket = WebSocket;
}

/**
 * Initializes a Supabase client scoped to the user request.
 * It passes the incoming request's Authorization header to Supabase
 * to enforce Row Level Security (RLS) policies within the database.
 */
export function getSupabaseClient(req: express.Request): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.");
  }

  // Retrieve the Authorization header from the Express request
  const authHeader = req.headers["authorization"];

  // Check if the request contains a real user JWT token (not just the public anon key)
  const isUserAuthenticated = authHeader && authHeader !== `Bearer ${supabaseAnonKey}`;

  // Use the user's token with the anon key to enforce RLS if they are logged in.
  // Fall back to the service_role key to bypass RLS if there is no user token (system/test requests).
  const keyToUse = isUserAuthenticated ? supabaseAnonKey : (serviceRoleKey || supabaseAnonKey);

  return createClient(supabaseUrl, keyToUse, {
    global: {
      headers: isUserAuthenticated ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Initializes a clean service role Supabase client bypassing request scopes.
 */
export function getServiceRoleClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}
