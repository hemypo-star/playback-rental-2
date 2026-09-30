import type { ServerFunctionClient } from 'payload'
import config from '@payload-config'
import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './cms/importMap.js'
// @payloadcms/next's "./css" export resolves to a precompiled styles.css
// (all of Payload's admin component CSS, including the --theme-* custom
// properties custom.css's overrides below depend on) — it is NOT injected
// automatically by RootLayout, the consuming app must import it itself. This
// was missing entirely, which is the actual cause of the unstyled /cms
// admin: without it, component classes like .btn/.card/.login render with
// every themed property (background, border, color) resolving to invalid/
// transparent because the --theme-* variables they reference were never
// defined anywhere. Order matters — custom.css's overrides must load after
// this so they win the cascade.
import '@payloadcms/next/css'
import './custom.css'

type Args = Readonly<{
  children: React.ReactNode
}>

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    <>{children}</>
  </RootLayout>
)

// The bare `{children}` form fails Next's build-time check against its
// generated LayoutProps: @types/react 19.2's ReactPortal now requires its
// own `children` field, which makes the plain ReactElement `children`
// resolves to here structurally fail assignability to ReactNode in that one
// generated-type comparison — a real @types/react 19.2 ecosystem quirk, not
// a bug in this component. Wrapping in a Fragment sidesteps it. Previously
// this alone wasn't enough and the whole check was suppressed via
// `typescript.ignoreBuildErrors` in next.config.mjs; upgrading to Next 16.3
// (see docs/PLAN-next-migration.md §0.2) made the Fragment-wrapped form
// pass the generated-type check too, so that flag was removed — don't
// revert this Fragment wrap without re-verifying `next build` still passes.
export default Layout
