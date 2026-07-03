import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const randomEmail = `test_${Math.floor(Math.random() * 100000)}@gmail.com`;
  const password = "password123";

  console.log(`\n1. Registering new user: ${randomEmail}...`);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: randomEmail,
    password: password,
    options: {
      data: {
        full_name: "Nguyen Test Auth",
      }
    }
  });

  if (signUpErr) {
    console.error("Sign-up failed:", signUpErr.message);
    return;
  }
  console.log("Sign-up succeeded! User ID:", signUpData.user.id);

  console.log(`\n2. Immediately signing in as: ${randomEmail}...`);
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: randomEmail,
    password: password,
  });

  if (signInErr) {
    console.error("Sign-in failed. Error:", JSON.stringify(signInErr, null, 2));
  } else {
    console.log("Sign-in succeeded! Session established for user ID:", signInData.user.id);
  }
}

test();
