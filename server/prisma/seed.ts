// Todora is multi-user now: data is created per registered account through the
// app's sign-up flow, not seeded. This seed is intentionally a no-op so a clean
// database starts empty and each user builds their own workspaces after login.
async function main() {
  console.log("No seed data — register an account in the app to get started.");
}

main();
