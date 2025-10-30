const languages = [
    "en",
    "zh-Hant",
    "zh-Hans",
] as const;

type Language = (typeof languages)[number];

export type { Language };
export { languages };
