/**
 * Turns the teacher's note from the diary PDF into display paragraphs: the
 * greeting and sign-off lines are dropped, and wrapped lines are rejoined.
 */

export function cleanTeacherNote(text) {
  if (!text) return [];

  const lines = text.split("\n").map((l) => l.trim());
  const salutationRe =
    /^(?:dear\s+parents?|dear\s+sir(?:\s*\/\s*madam)?|hello\s+parents?|notes?|additional\s+information)\s*[:,\.]?$/i;
  const valedictionRe =
    /^(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?$/i;

  const rawParagraphs = [];
  let currentWords = [];

  for (const line of lines) {
    if (!line) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    if (salutationRe.test(line)) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    if (valedictionRe.test(line)) {
      if (currentWords.length > 0) {
        rawParagraphs.push(currentWords.join(" "));
        currentWords = [];
      }
      continue;
    }
    currentWords.push(line);
  }

  if (currentWords.length > 0) {
    rawParagraphs.push(currentWords.join(" "));
  }

  const cleaned = [];
  for (const p of rawParagraphs) {
    let s = p
      .replace(/^(?:dear\s+parents?|dear\s+parent|notes?)\s*[:,\.]?\s*/i, "")
      .replace(
        /\s*(?:warm\s+regards|with\s+warm\s+regards|best\s+regards|kind\s+regards|regards|thanks\s+and\s+regards|thank\s+you)\s*[\.,]?\s*$/i,
        "",
      )
      .trim();
    if (s) cleaned.push(s);
  }

  return cleaned;
}
