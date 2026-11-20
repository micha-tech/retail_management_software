import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Sign in to PocketShop" };

export default function PocketShopLoginPage() {
  return (
    <>
      <p className="ps-eyebrow">Store owner access</p>
      <h1>Welcome back</h1>
      <p>Sign in to manage your products, orders and deliveries.</p>
      <LoginForm intent="pocketshop" />
      <p className="ps-auth-link">New to PocketShop? <Link href="/pocketshop/register">Create a store</Link></p>
    </>
  );
}
