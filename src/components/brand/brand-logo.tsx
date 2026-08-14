import Image from "next/image";

export function BrandLogo() {
  return (
    <>
      <Image
        className="brand-lockup"
        src="/brand/retail-logic-lockup.png"
        width={1552}
        height={279}
        alt="Retail Logic"
      />
      <Image
        className="brand-mark"
        src="/brand/retail-logic-mark.png"
        width={371}
        height={292}
        alt=""
        aria-hidden="true"
      />
    </>
  );
}
