const FALLBACK_GIF = "https://media.giphy.com/media/3o7TKOQ6Nf6k2lA5nG/giphy.gif";

const KEYWORD_GIFS: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["squat", "leg press", "lunge"],
    url: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
  },
  {
    keywords: ["bench", "push", "chest", "dip"],
    url: "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
  },
  {
    keywords: ["deadlift", "row", "pull", "back"],
    url: "https://media.giphy.com/media/3o6fJ1BM7R2EBRDnxK/giphy.gif",
  },
  {
    keywords: ["curl", "bicep", "tricep", "shoulder", "press"],
    url: "https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif",
  },
  {
    keywords: ["plank", "crunch", "core", "abs"],
    url: "https://media.giphy.com/media/xUPGcguWZHRC2HyBRS/giphy.gif",
  },
  {
    keywords: ["run", "bike", "cardio", "jump"],
    url: "https://media.giphy.com/media/26gsspfbt1HfVQ9va/giphy.gif",
  },
];

export function resolveExerciseGifUrl(exerciseName: string) {
  const normalized = exerciseName.toLowerCase();

  const match = KEYWORD_GIFS.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword)),
  );

  return match?.url ?? FALLBACK_GIF;
}
