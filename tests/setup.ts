import "dotenv/config";

// Ensure test database URL is set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://flutur:dev@localhost:5433/flutur_dev";
}
process.env.DEFAULT_TENANT = "flutur";
