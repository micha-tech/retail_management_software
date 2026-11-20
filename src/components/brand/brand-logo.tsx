import Image from "next/image";

export function BrandLogo() {
  return (
    <>
      <Image
        className="brand-lockup"
        src="/brand/zyphr-logic-lockup.png"
        width={1552}
        height={279}
        alt="Zyphr Logic"
      />
      <Image
        className="brand-mark"
        src="/brand/zyphr-logic-mark.png"
        width={371}
        height={292}
        alt=""
        aria-hidden="true"
      />
    </>
  );
}
