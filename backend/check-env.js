import dotenv from "dotenv";
dotenv.config();

console.log("Printing all environment variables starting with SEPAY_:");
Object.keys(process.env).forEach(key => {
  if (key.startsWith("SEPAY_")) {
    console.log(`${key}=${process.env[key]}`);
  }
});
