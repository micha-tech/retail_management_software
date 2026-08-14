import { sql } from "drizzle-orm";
import { db } from "@/db/client";
export const dynamic="force-dynamic";
export async function GET(){try{await db.execute(sql`select 1`);return Response.json({status:"ok",database:"reachable"},{headers:{"Cache-Control":"no-store"}})}catch{return Response.json({status:"degraded",database:"unreachable"},{status:503,headers:{"Cache-Control":"no-store"}})}}
