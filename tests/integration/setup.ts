const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === testDatabaseUrl && process.env.ALLOW_TEST_DATABASE !== "yes") throw new Error("Refusing to run integration tests against DATABASE_URL. Use a dedicated TEST_DATABASE_URL and set ALLOW_TEST_DATABASE=yes only in an isolated test environment.");
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DATABASE_CA_CERT_BASE64 = process.env.TEST_DATABASE_CA_CERT_BASE64 || "";
  process.env.DATABASE_CA_CERT_PATH = "";
}
