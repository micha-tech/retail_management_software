import type { MetadataRoute } from "next";
const routes=["","/features","/solutions","/solutions/supermarkets","/solutions/multi-branch-retail","/solutions/ecommerce","/pricing","/about","/contact","/book-demo","/privacy","/terms"];
export default function sitemap():MetadataRoute.Sitemap{const base=process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000";return routes.map((route,i)=>({url:`${base}${route}`,lastModified:new Date(),changeFrequency:i===0?"weekly":"monthly",priority:i===0?1:route==="/book-demo"?.8:.7}))}
