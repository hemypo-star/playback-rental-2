import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { checkRateLimits, type RateLimitCheck } from '../lib/security/rateLimit'
import { getClientIp } from '../lib/security/clientIp'

// Throttled at the account level too — not just by IP — because the IP
// dimension can legitimately be unavailable (TRUST_PROXY_HEADERS off, the
// default for this repo's own compose.yaml, which puts nothing in front of
// `cms`; see clientIp.ts). getClientIp() then returns null and the IP
// check is skipped entirely for that request, same as checkout falls back
// to its phone dimension. Login, forgotPassword and unlock each read a
// target account (email/username) straight out of `args.data` before any
// DB lookup happens, so normalizing that into its own bucket gives every
// one of these a real second dimension that doesn't depend on trusting a
// header — a specific account can't be brute-forced/hammered regardless of
// whether the IP dimension is checkable this request.
function accountRateLimitKey(data: unknown): string {
  const email = data && typeof data === 'object' && 'email' in data ? (data as { email?: unknown }).email : undefined
  const username =
    data && typeof data === 'object' && 'username' in data ? (data as { username?: unknown }).username : undefined
  const raw = typeof email === 'string' && email ? email : typeof username === 'string' && username ? username : ''
  return raw.toLowerCase().trim() || 'unknown'
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  access: {
    // No public signup — admin accounts are provisioned via the
    // create-first-user flow / an existing admin, never the public API.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'email',
  },
  hooks: {
    // A2 (design_handoff_swiss_bento/08-instruction.md, audit G1) — login,
    // forgotPassword and unlock are all rate-limited here, by IP and by
    // the targeted account. `beforeOperation` is the earliest hook a
    // collection gets: for login it runs before Payload's loginOperation
    // does its DB lookup or password comparison
    // (payload/dist/auth/operations/login.js — beforeOperation fires at
    // the very top; the collection's own `beforeLogin` hook, by contrast,
    // only fires *after* a successful password check, so it can't gate a
    // brute-force attempt at all). forgotPassword and unlock run the same
    // beforeOperation hook before their own DB work — verified directly in
    // payload/dist/auth/operations/{forgotPassword,unlock}.js, both of
    // which call buildBeforeOperation with their own operation name before
    // touching the target user. `refresh` deliberately gets no throttle:
    // its own operation (payload/dist/auth/operations/refresh.js) requires
    // `args.req.user` to already be set, i.e. a valid, already-authenticated
    // session — there's no brute-forceable secret to protect here, since
    // reaching this hook at all already required a real login. No custom
    // endpoint/proxy needed for any of these — they're Payload's own
    // `/api/users/{login,forgot-password,unlock}`, routed through the
    // shared (payload)/api/[...slug] catch-all, so a beforeOperation hook
    // on this collection is the one place that sees every attempt
    // regardless of transport.
    //
    // Every other collection operation (create/read/update/delete/refresh/
    // etc.) also runs this hook — it's a no-op for all of them, returning
    // `args` unchanged, so admin CRUD elsewhere is untouched.
    beforeOperation: [
      // Deliberately not destructuring `args`/`operation` in the parameter
      // list: `BeforeOperationArg`'s type is a discriminated union keyed on
      // `operation` (each variant pairs a specific `operation` literal with
      // the matching `args` shape for that operation, e.g. only login/
      // forgotPassword/unlock's variants have `args.data.email`). TS only
      // narrows `hookArgs.args`'s type from a check against
      // `hookArgs.operation` accessed through the same object reference —
      // copying `operation` out to its own local first (as the previous
      // version of this hook did, back when it never needed `args.data`)
      // would still narrow that local fine, but not `hookArgs.args`, which
      // would stay the full cross-operation union and fail to typecheck
      // `.data` at all.
      async (hookArgs) => {
        if (hookArgs.operation !== 'login' && hookArgs.operation !== 'forgotPassword' && hookArgs.operation !== 'unlock') {
          return hookArgs.args
        }
        const { operation, req } = hookArgs

        const ipBucket = operation === 'login' ? 'login_ip' : operation === 'forgotPassword' ? 'forgot_password_ip' : 'unlock_ip'
        const accountBucket =
          operation === 'login' ? 'login_account' : operation === 'forgotPassword' ? 'forgot_password_account' : 'unlock_account'

        const ip = getClientIp(req.headers)
        const accountKey = accountRateLimitKey(hookArgs.args.data)

        // Always check the account dimension (it never depends on a
        // trusted header). Only also check the IP dimension when a real,
        // trustworthy IP is available — getClientIp() returns null rather
        // than 'unknown' when TRUST_PROXY_HEADERS is off (see clientIp.ts),
        // specifically so this doesn't collapse into one shared bucket for
        // every visitor when there's no proxy to trust.
        //
        // One checkRateLimits() call, not two separate checkRateLimit()
        // calls under Promise.all — review fix, same reasoning as
        // checkout/actions.ts: two independent checks each record their
        // own hit as soon as THEY pass, so an attempt rejected on (say)
        // the account dimension alone would still have already spent a
        // slot of the IP bucket for a login that never actually happened.
        // checkRateLimits checks every listed bucket first and only
        // records a hit in any of them once every one is confirmed under
        // its limit.
        const rateLimitChecks: RateLimitCheck[] = [{ bucket: accountBucket, key: accountKey }]
        if (ip) rateLimitChecks.push({ bucket: ipBucket, key: ip })
        const allowed = await checkRateLimits(req.payload, rateLimitChecks)

        if (!allowed) {
          // isPublic: true (4th arg) — this message is meant to reach the
          // client. formatErrors() (payload/dist/utilities/formatErrors.js)
          // turns this into { errors: [{ message }] }, exactly the shape
          // AdminLoginForm.tsx already reads via body?.errors?.[0]?.message
          // — no client change needed. Doesn't say "too many attempts for
          // this account" or otherwise hint whether the email exists — the
          // account bucket is keyed off the *submitted* value, not off a
          // DB lookup result, so this can't leak account existence either
          // way. Payload's own forgotPassword operation already avoids
          // leaking whether an account exists (a generic "email sent" no
          // matter what) — this doesn't regress that, since the throttle
          // fires before that operation's own logic ever runs.
          const message =
            operation === 'login'
              ? 'Слишком много попыток входа. Подождите немного и попробуйте снова.'
              : operation === 'forgotPassword'
                ? 'Слишком много запросов на восстановление пароля. Подождите немного и попробуйте снова.'
                : 'Слишком много попыток разблокировки. Подождите немного и попробуйте снова.'
          throw new APIError(message, 429, undefined, true)
        }

        return hookArgs.args
      },
    ],
  },
  fields: [],
}
