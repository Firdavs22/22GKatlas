import TeamCalendar from "@/components/TeamCalendar";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const initialScope =
    scope === "personal" || scope === "common" ? scope : "all";
  return <TeamCalendar initialScope={initialScope} />;
}
