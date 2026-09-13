// Server-side zxcvbn gate for account passwords. Lazily imported because the
// dictionary is heavy; registration is rare enough to absorb the first load.
// Client-side vault passphrases use lib/vault/strength.ts instead.

// zxcvbn scores 0 (weakest) to 4. 3 = "safely unguessable", matching the vault.
// The app has no password reset, so weak choices are rejected outright.
export const MIN_PASSWORD_SCORE = 3;

type Checker = (
  pw: string,
  userInputs: string[]
) => { score: number; warning: string; suggestion: string };

let checkerPromise: Promise<Checker> | null = null;

async function getChecker(): Promise<Checker> {
  if (!checkerPromise) {
    checkerPromise = (async () => {
      // language-en supplies the translations; without it feedback comes back
      // as i18n keys ("topTen") rather than readable text.
      const [core, common, en] = await Promise.all([
        import("@zxcvbn-ts/core"),
        import("@zxcvbn-ts/language-common"),
        import("@zxcvbn-ts/language-en"),
      ]);
      const factory = new core.ZxcvbnFactory({
        dictionary: { ...common.dictionary, ...en.dictionary },
        graphs: common.adjacencyGraphs,
        translations: en.translations,
      });
      return (pw: string, userInputs: string[]) => {
        const r = factory.check(pw, userInputs);
        return {
          score: r.score,
          warning: r.feedback.warning ?? "",
          suggestion: r.feedback.suggestions?.[0] ?? "",
        };
      };
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
  const { score, warning, suggestion } = checker(
    password,
    userInputs.filter(Boolean)
  );

  if (score >= MIN_PASSWORD_SCORE) return { ok: true };

  const advice =
    [warning, suggestion].filter(Boolean).join(" ") ||
    "Use a longer password built from unrelated words or varied characters.";
  return { ok: false, error: `Password is too weak. ${advice}` };
}
