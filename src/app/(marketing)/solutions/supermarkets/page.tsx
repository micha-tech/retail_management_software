import type { Metadata } from "next";import { SolutionPage } from "@/components/marketing/solution-page";
export const metadata:Metadata={title:"Supermarket Management Software",description:"Connect supermarket POS, inventory, employees, suppliers, customers, and reporting with Retail Logic.",alternates:{canonical:"/solutions/supermarkets"}};
export default function Page(){return <SolutionPage kind="supermarkets"/>}
