"use client";
import { useEffect } from "react";
export default function DashboardError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error("Dashboard error",error.digest)},[error]);return <main className="page"><section className="surface error-surface"><p className="eyebrow">Something went wrong</p><h1>We could not load this page.</h1><p>No transaction should be retried blindly. Refresh the current view and verify its status.</p><button className="button primary" onClick={reset}>Try again</button></section></main>}
