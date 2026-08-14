import type { Instrumentation } from "next";
import { logger } from "@/lib/logger";
export function register(){logger.info("server.started",{runtime:process.env.NEXT_RUNTIME,environment:process.env.VERCEL_ENV||process.env.NODE_ENV});}
export const onRequestError:Instrumentation.onRequestError=async(error,request,context)=>{logger.error("request.failed",error,{requestId:request.headers["x-request-id"],method:request.method,path:request.path,routeType:context.routeType,routePath:context.routePath,digest:typeof error==="object"&&error!==null&&"digest" in error?String(error.digest):undefined});};
