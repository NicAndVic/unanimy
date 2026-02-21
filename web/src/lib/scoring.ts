export type DecisionAlgorithm = "collective" | "most_satisfied";

export type ScoringOption = {
  decisionItemId: string;
  votes: number[];
};

export type ScoringInput = {
  algorithm: DecisionAlgorithm;
  allowVeto: boolean;
  options: ScoringOption[];
};

export type ScoringResult = {
  winnerDecisionItemId: string | null;
  optionStats: Array<{
    decisionItemId: string;
    totalScore: number;
    satisfiedCount: number;
    vetoCount: number;
  }>;
};

function sum(values: number[]) {
  return values.reduce((acc, current) => acc + current, 0);
}

export function computeDecisionResult(input: ScoringInput): ScoringResult {
  const optionStats = input.options.map((option) => {
    const totalScore = sum(option.votes);
    const satisfiedCount = option.votes.filter((value) => value >= 1).length;
    const vetoCount = option.votes.filter((value) => value === -2).length;

    return {
      decisionItemId: option.decisionItemId,
      totalScore,
      satisfiedCount,
      vetoCount,
    };
  });

  const nonVetoed =
    input.allowVeto && optionStats.some((option) => option.vetoCount > 0)
      ? optionStats.filter((option) => option.vetoCount === 0)
      : optionStats;

  const scoringPool = nonVetoed.length > 0 ? nonVetoed : optionStats;

  if (scoringPool.length === 0) {
    return { winnerDecisionItemId: null, optionStats };
  }

  const sorted = [...scoringPool].sort((a, b) => {
    if (input.algorithm === "collective") {
      return b.totalScore - a.totalScore;
    }

    if (b.satisfiedCount !== a.satisfiedCount) {
      return b.satisfiedCount - a.satisfiedCount;
    }

    return b.totalScore - a.totalScore;
  });

  return {
    winnerDecisionItemId: sorted[0]?.decisionItemId ?? null,
    optionStats,
  };
}
