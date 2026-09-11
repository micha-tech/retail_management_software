"use server";
import { z } from "zod";
import { db } from "@/db/client";
import { demoRequests } from "@/db/schema";
import { logger } from "@/lib/logger";

export type DemoFormState = { status: "idle"|"success"|"error"; message?: string; errors?: Record<string,string[]> };
const schema=z.object({fullName:z.string().trim().min(2,"Enter your full name").max(100),workEmail:z.email("Enter a valid work email").transform(v=>v.trim().toLowerCase()),phone:z.string().trim().min(7,"Enter a valid phone number").max(30),businessName:z.string().trim().min(2,"Enter your business name").max(150),businessType:z.enum(["Supermarket","Shopping Mall","Retail Store","Multi-branch Retailer","Wholesale Business","E-commerce Store","Other"]),locationCount:z.string().min(1,"Select a range"),employeeCount:z.string().min(1,"Select a range"),currentSoftware:z.string().trim().max(100).optional(),primaryChallenge:z.string().trim().min(10,"Tell us a little more about the challenge").max(500),preferredContact:z.enum(["Phone","Email","WhatsApp"]),message:z.string().trim().max(1000).optional(),consent:z.literal("on",{error:"Please confirm we may contact you"}),website:z.string().max(0).optional()});
export async function submitDemoRequest(_:DemoFormState,formData:FormData):Promise<DemoFormState>{
  const result=schema.safeParse(Object.fromEntries(formData));
  if(!result.success)return{status:"error",message:"Please review the highlighted fields.",errors:z.flattenError(result.error).fieldErrors};
  try{const {website,consent,...data}=result.data;void website;await db.insert(demoRequests).values({...data,currentSoftware:data.currentSoftware||null,message:data.message||null,consent:consent==="on"});return{status:"success",message:"Thank you. Our team will review your business requirements and contact you to schedule your Retail Logic demonstration."};}
  catch(error){logger.error("Demo request submission failed",{error});return{status:"error",message:"We could not send your request right now. Please try again shortly."};}
}
