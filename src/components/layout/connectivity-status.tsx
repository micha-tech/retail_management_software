"use client";
import { useEffect, useState } from "react";
export function ConnectivityStatus(){const[online,setOnline]=useState(true);useEffect(()=>{const update=()=>setOnline(navigator.onLine);update();window.addEventListener("online",update);window.addEventListener("offline",update);return()=>{window.removeEventListener("online",update);window.removeEventListener("offline",update)}},[]);return online?null:<div className="offline-banner" role="alert">Offline — checkout is unavailable until the server connection returns.</div>}
