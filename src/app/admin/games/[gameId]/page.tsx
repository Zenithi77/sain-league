import AdminGameDetailClient from "@/components/AdminGameDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminGameDetailPage({
  params,
}: {
  params: { gameId: string };
}) {
  return (
    <div className="admin-page-content">
      <AdminGameDetailClient gameId={params.gameId} />
    </div>
  );
}
