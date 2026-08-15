/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    // Set by middleware.ts's /admin/* guard once a session is confirmed —
    // admin pages read this instead of re-fetching /api/users/me
    // themselves. Only present on /admin/* requests past the guard.
    adminUser?: import('./lib/admin/session').AdminUser
  }
}
