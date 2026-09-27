# Draft: proportionate enforcement for chat reports

**Status:** product-policy proposal for review. It does not enable automatic sanctions or change the current moderation rules.

## Core rule

A report is an allegation, not a violation. A pending report, dismissed report, duplicate report, or several reports about the same incident must not automatically restrict an account. Only a moderator's reasoned finding that a distinct incident violated the rules can count toward progressive enforcement. A linked urgent-threat report remains part of the same incident unless the review establishes a separate event.

The purpose of escalation is to stop repeated harmful conduct while preserving ordinary platform use. Apply restrictions to the smallest relevant scope: the chat or messaging capability first, the responsible operator's account next, and the whole service listing or customer account only when evidence and severity justify it.

## Suggested ladder for repeated, non-severe violations

Count distinct, upheld incidents in rolling windows. These are starting thresholds to validate during the pilot, not fixed promises to users.

| Finding | Suggested response | Scope |
| --- | --- | --- |
| One substantiated low-severity incident | Written warning that identifies the rule and explains how to appeal; no account-wide restriction | The responsible participant |
| Second substantiated incident within 90 days | 24-hour messaging cooldown | Prevent new unsolicited chats; keep essential communication for existing bookings and support available |
| Third substantiated incident within 90 days | 7-day restriction on chat initiation, with a SuperAdmin review | The responsible account/operator; do not hide a service listing automatically |
| Fourth substantiated incident within 180 days, or repeated conduct after the 7-day restriction | Consider up to 30 days of account-level restrictions after a SuperAdmin decision | Limit only the affected account or operator; preserve unrelated bookings where safe |

These steps should not stack multiple penalties for the same incident. A clean 90-day period removes older low-severity incidents from the short-window count. Any upheld finding used for escalation must have a reason, reviewer, timestamp, linked case, and appeal outcome recorded.

## Severe or urgent cases

A single **confirmed** severe incident can justify a stronger response; the number of reports is not the trigger. Examples include a credible threat of physical harm, doxxing, extortion, or substantiated fraud. The response should match the harm and evidence: remove or restrict the specific content, prevent contact with the affected person, and escalate to a senior moderator. A service listing should be paused only when the evidence points to a safety, fraud, or service-quality risk that makes the listing itself unsafe.

When a report describes an imminent threat but review is not complete, allow a short, narrowly scoped protective hold (for example, preventing contact between the two participants) while a senior reviewer checks the evidence promptly. A report alone must not cause a permanent ban. The subject should receive notice once doing so will not increase risk, with a reason and appeal path.

## Fairness and safeguards

- Count confirmed incidents, not complainants, report volume, message count, or unreviewed allegations. Multiple reports about one event count as one event.
- Review both sides' relevant context. Do not accept a retaliatory counter-report as proof; assess any new allegation independently and link related cases.
- Apply the same standards to clients and service operators. For a service with multiple staff, restrict the responsible staff account before limiting the whole business.
- Do not suspend an entire service for ordinary chat misconduct. Keep existing booking communications and safety support available unless those channels are part of the risk.
- Give a clear reason, duration, affected features, and appeal route for every restriction. Remove a strike from the count if the decision is overturned.
- Keep temporary protective measures separate from disciplinary findings, set an expiry, and require prompt human review.

## Rollout recommendation

For the pilot, keep sanctions manual: warnings and case-specific blocks can be recorded with a reason; account-wide or service-wide suspensions require a SuperAdmin decision. Collect anonymized counts of upheld reports, reversals, appeals, repeat incidents, and restriction outcomes before turning the suggested thresholds into automated product rules. Review the thresholds after an initial pilot period and adjust them using those outcomes.
