# ADR — LLM Governance and Operational Control

## Status

**Accepted**

## Context

Large Language Models (e.g., Claude, ChatGPT) are used in this repository to assist with design, implementation, testing, and review.

LLMs are capable implementation assistants but are non-authoritative. They do not make decisions. They do not define requirements. They do not resolve ambiguity.

Prior iterations demonstrated measurable risks when LLM assistance operates without explicit constraints:

- **Scope creep**: LLMs expand PR scope "while they're here" without authorization.
- **Helpful overreach**: LLMs introduce frameworks, abstractions, or tooling not requested.
- **Silent reinterpretation**: LLMs resolve ambiguous requirements by guessing, rather than stopping.

A formal governance mechanism is required to:

- Preserve architectural invariants across all LLM-assisted work.
- Prevent authority leakage from human decision-makers to LLM assistants.
- Ensure repeatability and auditability across projects and sessions.

## Decision

The file `CLAUDE_OPERATIONAL_CONTRACT.md` is the authoritative governance document for all LLM-assisted work in this repository.

All LLM-assisted work must comply with the operational contract. This applies to:

- Design
- Implementation
- Refactoring
- Testing
- Review

LLMs operating in this repository are:

- Implementation assistants only.
- Never decision-makers.
- Never sources of truth.
- Never authorities on requirements, architecture, or scope.

If there is a conflict between:

1. This ADR
2. Any future instruction
3. Any LLM suggestion

The operational contract wins. This hierarchy is absolute and non-negotiable.

## Enforcement

Violations of the operational contract are treated as process failures, not minor issues.

Any pull request produced with LLM assistance may be rejected if it:

- Violates the scope defined in the task or PR description.
- Invents requirements not explicitly stated.
- Resolves ambiguity implicitly rather than surfacing it.
- Bypasses tests, invariants, or architectural constraints.
- Introduces tooling, frameworks, or abstractions not approved.

"Helpfulness" is not a valid justification for contract violations. An LLM producing unauthorized work—regardless of quality—has failed.

Human reviewers retain final authority over all LLM-assisted output. LLM suggestions are proposals, not decisions.

Enforcement is procedural. Reviewers are expected to:

1. Verify scope compliance.
2. Reject work that violates the contract.
3. Require rework from scratch if necessary.

## Consequences

- LLM output that violates the contract may be discarded entirely.
- Work may be redone from scratch rather than corrected incrementally.
- Governance rules established here are portable to future repositories.
- Onboarding cost for new LLM sessions is reduced through explicit constraints.
- Architectural integrity is preserved long-term by preventing incremental drift.

## References

- `CLAUDE_OPERATIONAL_CONTRACT.md`
