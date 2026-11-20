import Link from "next/link";
import { RegisterPocketForm } from "@/components/pocketshop/register-form";

export const metadata = { title: "Create your PocketShop" };

export default function PocketShopRegisterPage() {
  return (
    <>
      <p className="ps-eyebrow">Start selling</p>
      <h1>Create your store</h1>
      <p>A simple online shop with products, orders, payments and delivery management in one place.</p>
      <RegisterPocketForm />
      <p className="ps-auth-link">Already have a store? <Link href="/pocketshop/login">Sign in</Link></p>
    </>
  );
}
