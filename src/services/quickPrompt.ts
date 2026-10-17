/**
 * Quick Prompt / Chat Polish Engine (100% On-Device, Instant, Zero-Cost)
 * Automatically cleans typos, corrects contractions, standardizes punctuation,
 * and fixes grammar directly into the active chat area.
 */

export function polishTextForChat(input: string): string {
  if (!input || !input.trim()) return input;

  let text = input.trim();

  // 1. Normalize multiple spaces and tabs to single spaces
  text = text.replace(/[ \t]+/g, ' ');

  // 2. Fix excessive punctuation while preserving intent (e.g. "what ????" -> "what?", "wow !!!" -> "wow!")
  text = text.replace(/\s+([.,!?;:])/g, '$1');
  text = text.replace(/\?{2,}/g, '?');
  text = text.replace(/!{2,}/g, '!');

  // 3. Capitalize first letter of sentences
  text = text.replace(/(^\s*|\.\s+|\?\s+|!\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  // 4. Common contraction & spelling fixes dictionary
  const fixes: Record<string, string> = {
    teh: 'the',
    recieve: 'receive',
    seperate: 'separate',
    definately: 'definitely',
    occured: 'occurred',
    untill: 'until',
    alot: 'a lot',
    dont: "don't",
    cant: "can't",
    wont: "won't",
    didnt: "didn't",
    isnt: "isn't",
    arent: "aren't",
    couldnt: "couldn't",
    shouldnt: "shouldn't",
    wouldnt: "wouldn't",
    hasnt: "hasn't",
    havent: "haven't",
    im: "I'm",
    ive: "I've",
    id: "I'd",
    ill: "I'll",
    youre: "you're",
    theyre: "they're",
    weve: "we've",
    whats: "what's",
    hows: "how's",
    theres: "there's",
    whered: "where'd",
    idk: "I don't know",
    tbh: "to be honest",
    omw: "on my way",
    brb: "be right back",
    plz: "please",
    pls: "please",
    thx: "thanks",
    tnx: "thanks",
    u: "you",
    r: "are",
    ur: "your",
    cuz: "because",
    coz: "because",
  };

  for (const [bad, good] of Object.entries(fixes)) {
    text = text.replace(new RegExp(`\\b${bad}\\b`, 'gi'), (match) => {
      // Preserve uppercase first letter if source was capitalized
      if (match[0] === match[0].toUpperCase()) {
        return good.charAt(0).toUpperCase() + good.slice(1);
      }
      return good;
    });
  }

  // Ensure trailing punctuation for complete sentences if user didn't add one
  if (!/[.!?]$/.test(text) && text.length > 15) {
    text += '.';
  }

  return text;
}

/**
 * Convert any unstructured spoken text or list into a clean Markdown checklist.
 * E.g.: "first buy groceries then review the PR and also call mom"
 * ->
 * - [ ] Buy groceries
 * - [ ] Review the PR
 * - [ ] Call mom
 */
export function convertToMarkdownChecklist(input: string): string {
  if (!input || !input.trim()) return input;
  const text = input.trim();

  // If already contains newlines, process line by line
  let rawItems: string[] = [];
  if (text.includes('\n')) {
    rawItems = text.split('\n');
  } else {
    // Split on typical spoken transitions and list delimiters:
    const delimiterRegex = /(?:;\s*|(?:\s|^)(?:firstly|secondly|first|then|next|also|and then|and also|finally)\s+|(?:\s|^)\d+[\.\)]\s+|(?:\s|^)[•\-\*]\s+)/i;
    rawItems = text.split(delimiterRegex);
  }

  const items = rawItems
    .map((item) => {
      // Strip leading bullet points, numbers, dashes, punctuation
      let cleaned = item.trim().replace(/^[\d\.\-\*\•\)\:\s]+/, '').trim();
      // Remove trailing commas/semicolons
      cleaned = cleaned.replace(/[,;]+$/, '').trim();
      if (!cleaned) return '';
      // Capitalize first letter
      return `- [ ] ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return `- [ ] ${text.charAt(0).toUpperCase() + text.slice(1)}`;
  }

  return items.join('\n');
}

