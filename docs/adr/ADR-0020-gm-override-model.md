# ADR-0020: GM Override Model

## Status

**Accepted**

## Context

The Deadlands 2.1 rules engine enforces deterministic, backend-authoritative game rules. However, tabletop RPGs require the Game Master (GM) to have final authority over all outcomes. The GM must be able to override any rules engine decision without compromising the integrity, auditability, or determinism of the system.

This ADR documents the authoritative model for GM overrides within the Intent → Rules → Outcome pipeline.

## Decision

GM overrides are explicit, auditable data objects that modify rules engine output. Overrides operate only on successful invocations, are chained for history, and emit mandatory warnings.

## Detailed Design

### Override Target

- Overrides operate **only** on `RulesInvocationResult` where `kind = "invocation"`
- Overrides **never** target violations
- A violation remains a violation; the GM cannot convert a violation into an invocation via override

### Override Decision Object

The GM override is a discrete data object with the following structure:

```
GMOverride {
  overrideId      : OverrideId
  parentOverrideId: OverrideId | null
  targetInvocationId: InvocationId
  timestamp       : Timestamp
  gmId            : GMId
  modifications   : OverrideModifications
  warning         : OverrideWarning
}

OverrideModifications {
  rulesetId       : RulesetId | null
  payloadPatches  : PayloadPatch[] | null
  payloadReplace  : Payload | null
}
```

Override power:

- Overrides **may** modify `rulesetId`
- Overrides **may** modify any invocation payload fields via patches
- Overrides **may** replace the entire payload
- Overrides **may not** alter `invocationId` or `sourceIntentId`

### Chaining Model

- Overrides form an append-only chain
- Each override references a `parentOverrideId` (except the first override, which has `null`)
- The **effective invocation** is derived by applying the override chain in order
- History is immutable; overrides are never deleted or modified
- To "undo" an override, a new override is appended that reverses the effect

Chain resolution:

```
EffectiveInvocation = applyChain(OriginalInvocation, [Override1, Override2, ..., OverrideN])
```

### Warning Semantics

- Every override **must** emit a warning
- Warning emission is mandatory; silent overrides are forbidden
- Warning severity is GM-chosen from a closed set:
  - `INFO` — Minor adjustment, cosmetic or narrative
  - `WARNING` — Significant deviation from rules-as-written
  - `CRITICAL` — Major override with gameplay consequences
- The engine records but does not reinterpret severity
- Severity is metadata for audit purposes only

```
OverrideWarning {
  severity : INFO | WARNING | CRITICAL
  message  : string
}
```

### Invariants

1. **Original invocation is immutable** — The engine's original output is preserved exactly as computed
2. **Overrides are explicit data** — No override occurs implicitly or silently
3. **Effective invocation is derivable** — Given the original invocation and the override chain, the effective invocation is deterministically computable
4. **Replay requires invocation + chain only** — Full state reconstruction requires only the original invocation and the ordered override chain
5. **Violations are never overridden** — A violation is a structural failure; it cannot be converted to success via override

## What This Enables

- GM retains final authority over all game outcomes
- Full audit trail of every GM intervention
- Deterministic replay of any game state
- Clear separation between engine authority and GM authority
- Override history supports dispute resolution and session review

## What This Forbids

- Converting violations into successful invocations
- Bypassing the validation layer
- Mutating the original intent
- Erasing or hiding engine output
- Silent or implicit overrides
- Modifying override history (append-only)

## Non-Goals

- This ADR does not define override UI or presentation
- This ADR does not define override persistence or storage
- This ADR does not define override authorization or permissions
- This ADR does not define network transport for overrides
- This ADR does not define undo/redo UX patterns

## Consequences

- All GM interventions are traceable and auditable
- The engine's deterministic guarantees remain intact
- Override chains add complexity to state resolution
- Storage requirements increase with override history
- Replay logic must account for override chain application
