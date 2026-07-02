/** Shared between client and API routes. */

export const AI_ACTIONS = {
  summarize: "Summarize note",
  title: "Create title",
  actionItems: "Extract action items",
  dates: "Extract dates & deadlines",
  tags: "Suggest tags",
  organize: "Organize into sections",
  meetingNotes: "Transcript → meeting notes",
  briefing: "Daily briefing",
} as const;

export type AIAction = keyof typeof AI_ACTIONS;

export const AI_PROMPTS: Record<AIAction, string> = {
  summarize:
    "Summarize the following note in 2-4 short sentences. Return only the summary, no preamble.",
  title:
    "Write a clean, specific title (max 8 words) for the following note. Return only the title.",
  actionItems:
    "Extract action items from the following note as a plain list, one per line, each starting with '- '. If there are none, reply exactly: No action items found.",
  dates:
    "Extract all dates, times and deadlines mentioned in the following note as a plain list, one per line, with what each refers to. If there are none, reply exactly: No dates found.",
  tags: "Suggest 2-5 short lowercase tags for the following note. Return them comma-separated, nothing else.",
  organize:
    "Reorganize the following rough note into clean markdown sections with headers and bullet points. Preserve all information. Return only the reorganized note.",
  meetingNotes:
    "Convert the following transcript into structured meeting notes with sections: Summary, Decisions, Action items, Open questions. Return only the notes in markdown.",
  briefing:
    "Write a short, calm daily briefing (max 150 words) from the following notes and calendar events. Lead with the most time-sensitive items.",
};

export interface AIRequestBody {
  action: AIAction;
  text: string;
}

export interface AIResponseBody {
  result: string;
  provider: string;
}
