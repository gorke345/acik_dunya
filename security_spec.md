# Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership (`/users/{userId}`)**: A player's save profile can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`. No blanket reads or cross-user reads are allowed.
2. **Immutable Identity & Creation Timestamp**: `uid` and `createdAt` must never change after creation, and `createdAt == request.time` on create; `updatedAt == request.time` on create and update.
3. **Bounded Schema & Anti-Shadow Fields**: Every write must match exact allowed keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), bounded strings, bounded numbers (`level` 1–99, `gold` 0–9999999, tiers 1–10, coords within ±200), and bounded arrays (`discoveredBiomes.size() <= 10`).
4. **Public Non-PII Split (`/leaderboard/{userId}`)**: Contains strictly non-PII warrior display stats (`uid`, `displayName`, `level`, `pvpKills`, `tunicColor`, `updatedAt`). Users can only write their own `leaderboard/{request.auth.uid}` entry.
5. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates `isValidId(userId)`.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. **Unauthenticated Read**: Anonymous/unauthenticated request to `get /users/alice`.
2. **Cross-User Read**: Authenticated user `bob` tries `get /users/alice`.
3. **Identity Spoofing on Create**: User `alice` creates `/users/alice` with `uid: "bob"`.
4. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create `/users/alice`.
5. **Shadow Field Injection**: User `alice` creates `/users/alice` with extra ghost field `isAdmin: true`.
6. **Value Poisoning on Update**: User `alice` updates `level` to `"999"` (string instead of int) or `9999` (out of range).
7. **Immutable Field Tampering**: User `alice` updates `createdAt` or `uid`.
8. **Fake Client Timestamp**: User `alice` creates `/users/alice` with `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()`.
9. **Array Flood (DoW)**: User `alice` writes 50 items into `discoveredBiomes` (exceeds max 10).
10. **Path ID Poisoning**: Request targeting `/users/invalid$id!with*badchars`.
11. **Oversized String Poisoning**: `displayName` of 500 characters (exceeds maxLength 24).
12. **Leaderboard Hijacking**: User `bob` attempts to update `/leaderboard/alice`.
