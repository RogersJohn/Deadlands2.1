# Intent → Rules Bridge Specification

## Overview

The Intent → Rules Bridge is a pure structural adapter that:
1. Accepts validated intents (branded, unforgeable proof tokens)
2. Selects the appropriate rules pipeline
3. Invokes the pipeline
4. Returns a ValidationReport

The bridge performs no interpretation, enrichment, resolution, or authority decisions.
It moves data, not meaning.

## Boundary Contract (PR 1.5 - Complete Flow)

```
Intent Layer                    Adapter                   Rules Pipeline
     |                            |                            |
     |   ValidatedIntent          |                            |
     |   (branded proof token)    |                            |
     |--------------------------->|                            |
     |                            |                            |
     |                            |   select pipeline          |
     |                            |   (exactly one must claim) |
     |                            |                            |
     |                            |   invoke pipeline          |
     |                            |--------------------------->|
     |                            |                            |
     |                            |   ValidationReport         |
     |                            |<---------------------------|
     |                            |                            |
     |   AdapterResult            |                            |
     |<---------------------------|                            |
     |   (report or failure)      |                            |
```

### Legacy Flow (Deprecated)

The original bridge only selected pipelines without invoking them:

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

### Primary Interface (PR 1.5)

The adapter exposes exactly ONE method:

```typescript
processIntent(intent: ValidatedIntent) → AdapterResult

AdapterResult =
  | { kind: 'report'; report: ValidationReport }
  | { kind: 'failure'; failure: AdapterFailure }
```

- Accepts ONLY ValidatedIntent (branded type)
- Gets claims from PipelineRegistry (not passed as argument)
- Invokes the selected pipeline
- Returns ValidationReport or AdapterFailure

No overloads. No optional parameters. No generics. No helper methods exposed.

### Legacy Interface (Deprecated)

```typescript
toRulesInvocation(
  intent: ValidatedIntent,
  authorityClaims: AuthorityClaim[]
) → Result<InvocationRequest, Violation>
```

This interface only selects pipelines without invoking them.

---

## Input Types

### ValidatedIntent (PR 1.5 - Branded)

A validated intent that has passed through the validation layer.
Raw/unvalidated intents MUST NOT be accepted.

**PR 1.5 Enhancement:** ValidatedIntent is now a branded type:
- Cannot be created via object literal
- Cannot be assigned from RawIntent
- Can only be obtained via `createValidatedIntent()`
- The brand prevents accidental misuse at compile time

```typescript
// Branded type with unique symbol
type ValidatedIntent<TPayload = unknown> = {
  readonly intentId: IntentId;        // branded string
  readonly intentType: IntentType;    // branded string
  readonly payload: TPayload;
  readonly validationSummary: ValidationSummary;
  readonly [VALIDATED_INTENT_BRAND]: never;  // unforgeable brand
};

// Only way to create a ValidatedIntent
createValidatedIntent(validationResult: IntentValidationResult): ValidatedIntent | null
```

**Guarantees:**
- TypeScript prevents passing RawIntent to adapter
- Only validated intents can produce ValidatedIntent
- Runtime forgery is possible but violates the contract

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

### ValidationReport (PR 1.5)

The output of rules pipeline invocation:

```typescript
ValidationReport = {
  invocationId: InvocationId;
  sourceIntentId: string;
  intentType: IntentType;
  rulesetId: RulesetId;
  outcome: RulesOutcome;        // PASS | FAIL | AMBIGUOUS
  violations: RuleViolation[];
  ambiguity: RulesAmbiguity | null;
  payload: unknown;
}
```

**Outcomes:**
- `PASS`: All rules satisfied
- `FAIL`: One or more rules violated
- `AMBIGUOUS`: Rules cannot determine outcome; requires GM decision

### AdapterFailure (PR 1.5)

Adapter-level failures are TYPE-DISTINCT from rule violations:

```typescript
AdapterFailure = {
  code: AdapterFailureCode;
  intentId: string;
  intentType: IntentType;
  details: string;
  claimingRulesets?: RulesetId[];  // for MULTIPLE_PIPELINES_CLAIM_AUTHORITY
}

AdapterFailureCode =
  | NO_PIPELINE_CLAIMS_AUTHORITY       -- 0 matching claims
  | MULTIPLE_PIPELINES_CLAIM_AUTHORITY -- 2+ matching claims
  | PIPELINE_NOT_FOUND                 -- claim exists but pipeline missing
```

**Important:** These are NOT RuleViolations. Adapter failures occur before
rules are invoked. Rule violations occur during rules invocation.

### Legacy: Violation (Deprecated)

```
Violation {
  code     : ViolationCode  -- from closed enum
  intentId : IntentId       -- which intent failed
  details  : String?        -- optional diagnostic message
}
```

### Legacy: ViolationCode (Deprecated)

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

### Structural Assertions (PR 1.5)
- [x] Raw/unvalidated intents cannot be passed to the adapter (branded type)
- [x] Only ValidatedIntent is accepted (type-level enforcement)
- [x] ValidatedIntent can only be created via createValidatedIntent()

### Behavioral Assertions (PR 1.5)
- [x] Same input produces identical invocationId across calls
- [x] Input intent is not mutated
- [x] Adapter passes intent to pipeline without modification
- [x] Adapter does not alter payload in returned report

### Authority Assertions (PR 1.5)
- [x] No pipeline claims → NO_PIPELINE_CLAIMS_AUTHORITY
- [x] Multiple pipelines claim → MULTIPLE_PIPELINES_CLAIM_AUTHORITY
- [x] Exactly one pipeline claims → success
- [x] Claim exists but pipeline missing → PIPELINE_NOT_FOUND

### Pipeline Invocation Assertions (PR 1.5)
- [x] Adapter invokes pipeline and returns ValidationReport
- [x] PASS outcome passed through unchanged
- [x] FAIL outcome passed through unchanged
- [x] AMBIGUOUS outcome passed through unchanged (not resolved)

### Type Distinction Assertions (PR 1.5)
- [x] AdapterFailure is type-distinct from RuleViolation
- [x] Adapter failures have: code, intentId, intentType, details
- [x] Rule violations have: ruleId, message, severity

### Legacy Assertions (Deprecated)
- [ ] Empty claims array → NO_RULESET_CLAIMS_AUTHORITY
- [ ] No matching claims → NO_RULESET_CLAIMS_AUTHORITY
- [ ] Two matching claims → MULTIPLE_RULESETS_CLAIM_AUTHORITY
- [ ] Claim order does not affect violation (bridge never selects)
