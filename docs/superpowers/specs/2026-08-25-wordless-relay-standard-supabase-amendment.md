# WORDLESS Relay — standard Supabase transport amendment

**Status:** Approved by the project owner on 2026-08-25
**Amends:** `2026-08-24-wordless-relay-design.md`
**Scope:** Relay service, local credentials, Gate 0 setup, and service claims
**Product direction:** Unchanged

## 1. Trigger and decision

Lens Studio's Supabase Plugin rejected login because Snap Cloud powered by
Supabase remains in Alpha and the owner's Snapchat account is not yet approved.
The owner supplied a screenshot of that exact editor state after applying for
access. The original Snap Cloud entitlement gate therefore failed honestly; it
must not be represented as passed or hidden behind simulated traffic.

The owner approved ordinary hosted Supabase Realtime as the replacement relay
service. WORDLESS still connects one Spectacles Lens Studio Preview painter and
one ordinary browser guesser. No game feature, participant, state-authority,
visual-payoff, or evidence requirement changes under this amendment.

## 2. Selected transport

Both clients use a normal Supabase project and one public Realtime Broadcast
channel named `wordless-relay:<sessionId>`:

- The Lens uses the installed `SupabaseClient` 2.1.0 package through the built-
  in `SupabaseModule`. Snap's Lens API documents its request and realtime
  methods as supporting any Supabase project.
- The browser uses the current compatible `@supabase/supabase-js` package.
- The Lens adapter is named `SupabaseRelayTransport`; code, logs, environment
  variables, and evidence must not call it Snap Cloud.
- `RelayTransport` remains the service-neutral boundary. Neither adapter owns
  game state, validates correctness, or mutates a store.

The standard-project compatibility claim remains provisional until Gate 0
proves it in the active SPECS Preview. Installed package source and generated
Lens types remain the compile-time authority.

## 3. Unchanged authority and protocol

The original design's authority model remains binding:

- `WordlessEngine` alone owns round transitions and answer validation.
- Lens `RoundStore` remains authoritative; `WebRoundStore` is only a public
  browser projection.
- World-space points stay Lens-local. Only bounded, quantized normalized
  coordinates cross the transport.
- The browser submits a choice and never declares correctness.
- The correct index and selected word stay Lens-local until an authoritative
  result is published.
- Version, session, round, sender, connection, sequence, byte, and cadence
  validation remain mandatory.
- The existing readiness, targeted-ack, reset/ack/start, no-partial-merge, and
  one-outbound-FIFO contracts remain unchanged because Supabase Broadcast does
  not provide the product with authoritative replay.

## 4. Project and credential handling

The owner creates or selects a normal hosted Supabase project named
`wordless-relay`. This is an ordinary Supabase account/project action, not the
Lens Studio Snap Cloud Plugin or its Alpha program.

Realtime must be enabled and the project's **Allow public access to channels**
setting must remain enabled for this unauthenticated proof. If the current
dashboard exposes different wording, record the observed setting and prove an
unauthenticated public-channel join rather than guessing equivalence.

Only the project URL and a client-safe public key may reach either client. Use
the publishable key when the installed Lens package accepts it; otherwise use
the still-supported legacy anonymous public key and record that compatibility
result. Never use, request, print, log, commit, or bundle a secret key,
`service_role` key, database password, management token, or user access token.

The intended Lens credential container is a native `SupabaseProject` asset
under `Assets/LocalOnly/`, but generic native-asset authoring outside the Snap
Cloud Plugin is not assumed to work. Before the owner enters any value, Lens
Studio MCP must prove that the active editor can create this native asset type,
move it into the ignored directory, save it, and expose the expected field
names. If that credential-safe operation fails, Gate 0 fails immediately.

Only after that authoring probe passes may the owner paste values into the
asset's Inspector. Codex verifies only that the fields are populated; it never
reads their values. The directory and its `.meta` remain ignored.

The browser reads the same client-safe values from ignored `web/.env.local`.
After the exact compatible key type and variable names are proven, commit a
redacted example containing placeholders only. The intended names are:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLIC_KEY
VITE_RELAY_SESSION_ID
```

If the compatibility probe requires different names, the observed names
replace these before any example file is committed.

## 5. Runtime data flow

1. Lens and browser each create one Supabase client from the same normal
   project URL and public key.
2. Neither client performs Snap ID-token authentication for the public Gate 0
   Broadcast channel.
3. Both subscribe to `wordless-relay:<sessionId>` and run the approved
   application-level readiness handshake.
4. Lens sends bounded normalized point messages. Browser validates and renders
   accepted points.
5. Browser sends one fixed choice during the spike. Lens validates the event
   and changes a visible Preview state.
6. Later game messages continue through the same service-neutral envelope;
   only the Lens publishes authoritative result/reset/start messages.
7. Each client unsubscribes and removes its channel during teardown.

No table, database migration, Edge Function, storage bucket, or durable event
history belongs in the minimum proof. Public Broadcast is the only enabled
Supabase feature required by this amendment.

## 6. Security and honesty boundary

A Supabase publishable or anonymous key is designed for client distribution;
it is not an authorization boundary. With public-channel access enabled,
anyone who obtains the project key and channel name can attempt to subscribe or
broadcast. The protocol still rejects malformed, oversized, wrong-version,
wrong-session, wrong-role, duplicate, stale, gapped, and unauthorized-state
messages, but that does not make the demo production-secure.

The project may claim only a bounded hackathon relay proof. It must not claim
cryptographic game secrecy, production authentication, abuse resistance,
durable persistence, global scale, availability, or remote-play quality. A
session code is routing and lightweight concealment, not a security token.

The repository remains private during development. Public client values stay
uncommitted anyway, and all release/history secret scans remain mandatory.

## 7. Limits and operational risks

As observed on 2026-08-25, Supabase's Free plan documents 200 concurrent
Realtime connections, 100 messages per second, 100 channel joins per second,
and a 256 KB Broadcast payload limit. WORDLESS keeps the stricter provisional
product ceilings: two clients, one channel each, at most 128 accepted points,
point batches no faster than 10 Hz, and at most 1,024 serialized bytes per
message until measured evidence justifies less restrictive values.

Free Supabase projects may pause after low activity. Environment and capture
checklists must include opening/resuming the project, confirming Realtime is
enabled, and rerunning the two-way probe before recording. No readiness claim
may rely on a previously warm backend.

Rate-limit, channel-join, socket-close, or payload warnings fail the probe.
Record literal errors and reduce the product cap where appropriate; do not
mask them with retries or prerecorded behavior.

## 8. Amended Gate 0

Task 1 no longer requires Snap Cloud Alpha entitlement, a project listed in
the Supabase Plugin, or Plugin-generated credentials. It instead requires:

1. The failed Alpha gate and screenshot evidence recorded honestly.
2. A normal Supabase project created by the owner.
3. A credential-safe Lens MCP proof that a native `SupabaseProject` can be
   created, moved under `Assets/LocalOnly/`, saved, and inspected by field name;
   inability to do so is an immediate NO-GO.
4. After that proof, populated URL/public-key fields verified without reading
   their values.
5. Current package/type/API evidence, successful TypeScript compilation, and a
   clean SPECS Preview baseline.
6. Standard Supabase Free-plan limits, key type, and pause behavior recorded in
   `docs/environment.md`.

The browser and Lens spike then prove:

- a changing Lens-origin coordinate reaches and moves browser output;
- while that uninterrupted point stream remains active, a browser-origin
  choice reaches Lens validation and changes visible Lens Preview state;
- at least ten seconds of continuous updates completes without disconnect,
  transport warning, sequence error, or manual replay;
- while the stream remains active, fifty browser pings spaced 250 ms apart each
  produce a correlated Lens-origin application ack; only those paired events
  count as RTT samples;
- message count, serialized bytes, median/p95/maximum observed round-trip
  latency, package versions, commit hashes, and restart reproducibility are
  recorded;
- the evidence calls the service Supabase Realtime, never Snap Cloud.

Only a recorded GO unlocks later game tasks. Compile success or one-way traffic
alone remains a NO-GO.

## 9. Failure policy

If the installed Lens package cannot connect to the normal Supabase project,
if the public channel cannot carry simultaneous two-way Preview/browser
traffic, or if the proof violates measured limits, stop before game work.

Cloudflare Worker plus Durable Object over the documented Lens `wss://` API is
the next researched transport candidate, not an automatic fallback. Selecting
it requires another explicit owner-approved amendment. HTTPS polling,
provider-specific protocols without a supported Lens client, prerecorded
traffic, and silent backend substitution remain rejected.

The already-reviewed colocated WORDLESS Duo and Split the Table pivots remain
available only as product-level owner decisions.

## 10. Required document and implementation reconciliation

Before runtime work resumes, reconcile the existing implementation plan at
least across Tasks 1–4, 8, 16, 17, and 18:

- remove Alpha entitlement and Plugin-project requirements;
- replace Snap Cloud-specific adapter, variable, logger, evidence, and claim
  names with standard Supabase equivalents;
- remove Snap ID-token authentication from the public Broadcast probe;
- retain the installed Lens `SupabaseClient` and browser `supabase-js` paths;
- add normal-project creation, public-channel settings, key compatibility,
  free-project wakeup, and amended secret-scan checks;
- preserve every service-neutral protocol, state, visual, comprehension,
  polish, capture, and review requirement.

## 11. Source authority

- Snap `SupabaseModule`, documented for any Supabase project:
  <https://developers.snap.com/lens-studio/api/lens-scripting/classes/Built-In.SupabaseModule.html>
- Supabase Realtime Broadcast and public-channel behavior:
  <https://supabase.com/docs/guides/realtime/broadcast>
- Supabase Realtime public-channel setting:
  <https://supabase.com/docs/guides/realtime/settings>
- Supabase Realtime plan limits:
  <https://supabase.com/docs/guides/realtime/limits>
- Supabase Free-project pausing:
  <https://supabase.com/docs/guides/platform/free-project-pausing>
- Cloudflare WebSocket fallback research only:
  <https://developers.cloudflare.com/durable-objects/best-practices/websockets/>

The active installed package and generated definitions supersede examples when
version-specific behavior differs. This amendment supersedes only conflicting
Snap Cloud service/setup/claim language in the original design and plan.
