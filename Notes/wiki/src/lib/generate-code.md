# src/lib/generate-code.ts

Cryptographically secure random token generator for invite codes.

## Functions

### generateToken(): Promise\<string\>

Generates an 8-character alphanumeric token using `crypto.getRandomValues`. Character set: `A-Z`, `a-z`, `0-9` (62 chars). ~218 trillion possible values.
