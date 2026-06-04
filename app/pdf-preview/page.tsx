import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PdfPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { default: PdfPreviewClient } = await import("./PdfPreviewClient");
  return <PdfPreviewClient />;
}
