// Server-side zxcvbn gate for account passwords. Lazily imported because the
// dictionary is heavy; registration is rare enough to absorb the first load.
// Client-side vault passphrases use lib/vault/strength.ts instead.

// zxcvbn scores 0 (weakest) to 4. 3 = "safely unguessable", matching the vault.
// The app has no password reset, so weak choices are rejected outright.
export const MIN_PASSWORD_SCORE = 3;

type Checker = (pw: string, userInputs: string[]) => number;

let checkerPromise: Promise<Checker> | null = null;

async function getChecker(): Promise<Checker> {
  if (!checkerPromise) {
    checkerPromise = (async () => {
      const [core, common] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
      ]);
      const factory = new core.ZxcvbnFactory({
        dictionary: { ...common.dictionary },
        graphs: common.adjacencyGraphs,
      });
      // Only the score is used. zxcvbn's feedback strings are i18n *keys*
      // ("topTen", "userInputs") unless @zxcvbn-ts/language-en is installed,
      // so surfacing them raw would show users gibberish.
      return (pw: string, userInputs: string[]) =>
        factory.check(pw, userInputs).score;
    })();
  }
  return checkerPromise;
}

// `userInputs` (email, username) are penalised by zxcvbn, so a password built
// out of the user's own details scores low.
export async function checkPasswordStrength(
  password: string,
  userInputs: string[] = []
): Promise<{ ok: true } | { ok: false; error: string }> {
  const checker = await getChecker();
  const score = checker(password, userInputs.filter(Boolean));

  if (score >= MIN_PASSWORD_SCORE) return { ok: true };

  return {
    ok: false,
    error:
      "Password is too weak. Use a longer password built from unrelated words " +
      "or varied characters, and avoid common phrases, keyboard patterns, or " +
      "your own name and email.",
  };
}
