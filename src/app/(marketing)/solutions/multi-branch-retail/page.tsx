import type { Metadata } from "next";import { SolutionPage } from "@/components/marketing/solution-page";
export const metadata:Metadata={title:"Multi-Branch Retail Management Software",description:"Control sales, stock, employees, transfers, and performance across every retail location.",alternates:{canonical:"/solutions/multi-branch-retail"}};
export default function Page(){return <SolutionPage kind="multi-branch-retail"/>}
