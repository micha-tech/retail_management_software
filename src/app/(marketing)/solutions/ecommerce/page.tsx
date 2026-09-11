import type { Metadata } from "next";import { SolutionPage } from "@/components/marketing/solution-page";
export const metadata:Metadata={title:"E-commerce Inventory and Operations",description:"Bring online products, orders, customers, fulfillment, and inventory into one retail operations platform.",alternates:{canonical:"/solutions/ecommerce"}};
export default function Page(){return <SolutionPage kind="ecommerce"/>}
