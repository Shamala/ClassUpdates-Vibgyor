/**
 * The day's timetable, grouped into one card per subject.
 */
import { getCanonicalSubject } from "../subjects.js";

// Periods of the same subject (a double period, or the subject twice in a day)
// become one group, collecting each distinct topic, sub-topic, classwork, skill
// and homework, in the order the timetable lists them.
export function groupPeriodsBySubject(periods) {
  if (!periods || periods.length === 0) return [];

  const groupMap = new Map();
  const orderedGroups = [];

  for (const p of periods) {
    const rawSubj = (p.subject || "General").trim();
    const canonicalSubj = getCanonicalSubject(rawSubj);
    const key = canonicalSubj.toLowerCase();

    const topicStr = (p.topic || "").trim();
    const subTopicStr = (p.sub_topic || "").trim();
    const cwStr = (p.cw || "").trim();
    const skillStr = (p.skill_assessed || "").trim();

    if (groupMap.has(key)) {
      const group = groupMap.get(key);
      group.periodCount += 1;
      group.periods.push(p);

      if (
        topicStr &&
        topicStr.toUpperCase() !== "NIL" &&
        !group.topics.includes(topicStr)
      ) {
        group.topics.push(topicStr);
      }

      if (
        subTopicStr &&
        subTopicStr.toUpperCase() !== "NIL" &&
        subTopicStr !== "—" &&
        !group.subTopics.includes(subTopicStr)
      ) {
        group.subTopics.push(subTopicStr);
      }

      if (
        cwStr &&
        cwStr.toUpperCase() !== "NIL" &&
        !group.classworks.includes(cwStr)
      ) {
        group.classworks.push(cwStr);
      }

      if (
        skillStr &&
        skillStr.toUpperCase() !== "NIL" &&
        skillStr.toUpperCase() !== "NA" &&
        !group.skills.includes(skillStr)
      ) {
        group.skills.push(skillStr);
      }

      if (p.is_homework) {
        const hwKey = `${(p.reinforcement || "").toLowerCase()}|${(p.submission_date || "").toLowerCase()}`;
        if (
          !group.homeworkList.some(
            (h) =>
              `${(h.reinforcement || "").toLowerCase()}|${(h.submission_date || "").toLowerCase()}` ===
              hwKey,
          )
        ) {
          group.homeworkList.push(p);
        }
      }
    } else {
      const newGroup = {
        subject: canonicalSubj,
        cleanSubject: key,
        periodCount: 1,
        periods: [p],
        topics: topicStr && topicStr.toUpperCase() !== "NIL" ? [topicStr] : [],
        subTopics:
          subTopicStr &&
          subTopicStr.toUpperCase() !== "NIL" &&
          subTopicStr !== "—"
            ? [subTopicStr]
            : [],
        classworks: cwStr && cwStr.toUpperCase() !== "NIL" ? [cwStr] : [],
        skills:
          skillStr &&
          skillStr.toUpperCase() !== "NIL" &&
          skillStr.toUpperCase() !== "NA"
            ? [skillStr]
            : [],
        homeworkList: p.is_homework ? [p] : [],
      };
      groupMap.set(key, newGroup);
      orderedGroups.push(newGroup);
    }
  }

  return orderedGroups;
}

// "NIL" when a group has nothing for that field, which the card shows as such.
export function joinOrNil(list, separator) {
  return list.length > 0 ? list.join(separator) : "NIL";
}
