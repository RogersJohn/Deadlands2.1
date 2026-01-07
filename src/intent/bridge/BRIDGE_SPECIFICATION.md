# Intent → Rules Bridge Specification

## Overview

The Intent → Rules Bridge is a pure structural adapter that converts validated intents
into rules invocation requests. It performs no interpretation, enrichment, resolution,
or authority decisions.

## Boundary Contract

```
Intent Layer                    Bridge                    Rules Layer
     |                            |                            |
     |   ValidatedIntent          |                            |
     |--------------------------->|                            |
     |   + AuthorityClaims        |                            |
     |                            |                            |
     |                            |   RulesInvocationRequest   |
     |                            |--------------------------->|
     |                            |   (or Violation)           |
     |                            |                            |
```

## Public Interface

The bridge exposes exactly ONE method:

```
toRulesInvocation(
  intent: ValidatedIntent,
  authorityClaims: AuthorityClaim[]
) → Result<InvocationRequest, Violation>
```

No overloads. No optional parameters. No generics. No helper methods exposed.

---

## Input Types

### ValidatedIntent

A validated intent that has passed through the validation layer.
Raw/unvalidated intents MUST NOT be accepted.

```
ValidatedIntent {
  intentId      : IntentId           -- opaque identifier
  intentType    : IntentType         -- enumerated intent category
  payload       : ValidatedPayload   -- opaque validated data
  validationSummary : ValidationSummary  -- pass-through only, never inspected
}
```

### AuthorityClaim

Declarative claim that a ruleset handles a specific intent type.
The bridge does NOT discover rules; it receives these claims externally.

```
AuthorityClaim {
  rulesetId  : RulesetId   -- opaque identifier
  intentType : IntentType  -- which intent type this ruleset handles
}
```

---

## Output Types

### RulesInvocationRequest

Successful output containing everything needed to invoke the rules authority.

```
RulesInvocationRequest {
  invocationId   : InvocationId      -- deterministic hash (see below)
  sourceIntentId : IntentId          -- original intent reference
  intentType     : IntentType        -- preserved from input
  payload        : ValidatedPayload  -- preserved from input
  rulesetId      : RulesetId         -- from matched claim
}
```

### Violation

Structured failure output. No exceptions. No nulls. No partial success.

```
Violation {
  code     : ViolationCode  -- from closed enum
  intentId : IntentId       -- which intent failed
  details  : String?        -- optional diagnostic message
}
```

### ViolationCode (Closed Enum)

```
ViolationCode =
  | NO_RULESET_CLAIMS_AUTHORITY       -- 0 matching claims
  | MULTIPLE_RULESETS_CLAIM_AUTHORITY -- 2+ matching claims
  | INTENT_UNMAPPABLE_TO_RULES        -- structural mapping failure
```

No UNKNOWN. Every failure maps to exactly one code.

---

## Authority Claim Resolution

The bridge does NOT prefer or rank claims. Resolution is deterministic:

| Matching Claims | Result |
|-----------------|--------|
| 0 | Violation: NO_RULESET_CLAIMS_AUTHORITY |
| 1 | Success: pass through to RulesInvocationRequest |
| 2+ | Violation: MULTIPLE_RULESETS_CLAIM_AUTHORITY |

The bridge MUST NOT select among multiple claims. Ambiguity is a violation.

---

## Invocation ID Generation

The invocationId MUST be deterministic:

```
invocationId = hash(intentId + intentType + canonicalize(payload))
```

Properties:
- Same inputs → identical output
- No randomness
- No timestamps
- No UUID generation

Recommended algorithm: djb2 or similar deterministic string hash.

---

## Purity Guarantees

The bridge MUST be:
- Deterministic (same input → same output)
- Side-effect free
- Fully serializable
- Replayable

The bridge MUST NOT:
- Access system clock
- Read environment variables
- Read configuration
- Use logging as control flow
- Mutate inputs

---

## ValidationSummary Handling

The validationSummary field is:
- Passed through without inspection
- NOT used in invocationId generation
- NOT used in any branching logic

Different validation summaries with identical (intentId, intentType, payload)
MUST produce identical invocation IDs.

---

## Type Ownership

This bridge specification does NOT define:
- IntentId (opaque, externally defined)
- RulesetId (opaque, externally defined)
- InvocationId (opaque, externally defined)
- IntentType (enumerated, externally defined)
- ValidatedPayload (opaque, externally defined)

These types are referenced as external dependencies.

---

## Assertions (Documentation-Based Tests)

### Structural Assertions
- [ ] Raw/unvalidated intents cannot be passed to the bridge
- [ ] ValidatedIntent requires all four fields

### Behavioral Assertions
- [ ] Same input produces identical invocationId across calls
- [ ] Input intent is not mutated
- [ ] Input claims array is not mutated
- [ ] Different validationSummary values produce same invocationId

### Ambiguity Assertions
- [ ] Empty claims array → NO_RULESET_CLAIMS_AUTHORITY
- [ ] No matching claims → NO_RULESET_CLAIMS_AUTHORITY
- [ ] Two matching claims → MULTIPLE_RULESETS_CLAIM_AUTHORITY
- [ ] Claim order does not affect violation (bridge never selects)
