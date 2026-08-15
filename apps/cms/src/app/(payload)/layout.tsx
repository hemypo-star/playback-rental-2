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

// Next's build-time layout checker rejects this against its generated
// LayoutProps (see next.config.mjs's typescript.ignoreBuildErrors comment
// for why that's suppressed at the config level instead of here — a
// per-line suppression comment doesn't work: the diagnostic is anchored in
// Next's generated .next/types file, not this one, so it can't be
// suppressed from this source file at all. Also: don't start a line in
// this comment with the literal directive text, or tsc parses it as a real
// (and then "unused") suppression pragma — this note is why.)
export default Layout
