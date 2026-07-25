// Feature flags read from the environment.
//
// Public sign-ups are OFF by default: this app is a private tracker for a known
// set of people, so a stranger who finds the hosted URL should not be able to
// create an account. Set ALLOW_SIGNUPS="true" to temporarily re-open sign-ups
// (e.g. to seed the first accounts on a fresh database).
export const signupsEnabled = process.env.ALLOW_SIGNUPS === "true";
