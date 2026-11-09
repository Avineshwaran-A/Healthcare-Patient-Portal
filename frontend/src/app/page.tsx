import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/landing";
import { SiteMotion } from "@/components/motion/site-motion";
import { getMe } from "@/lib/server-api";

export default async function Home() {
  const me = await getMe();
  if (me) redirect(`/${me.role}`);

  return (
    <>
      <SiteMotion withLoader />
      <Landing />
    </>
  );
}
