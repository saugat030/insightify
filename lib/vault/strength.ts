"use client";

// Lazy zxcvbn wrapper. The library + its dictionary are heavy, so they are
// dynamically imported the first time a passphrase is scored and reused after.
// This keeps zxcvbn out of the initial editor bundle.

export interface StrengthResult {
  score: number; // 0 (weakest) .. 4 (strongest)
  warning: string;
  suggestions: string[];
}

// Minimum acceptable score at vault creation. Since there is no passphrase
// reset, weak choices are rejected outright.
export const MIN_VAULT_SCORE = 3;

let checkerPromise: Promise<(pw: string) => StrengthResult> | null = null;

async function getChecker() {
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
      return (pw: string): StrengthResult => {
        const r = factory.check(pw);
        return {
          score: r.score,
          warning: r.feedback.warning ?? "",
          suggestions: r.feedback.suggestions ?? [],
        };
      };
    })();
  }
  return checkerPromise;
}

export async function checkStrength(pw: string): Promise<StrengthResult> {
  const checker = await getChecker();
  return checker(pw);
}
