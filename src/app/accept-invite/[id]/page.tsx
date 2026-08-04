import { redirect } from "next/navigation";
import { getSession } from "@/lib/tenant";
import { AcceptInvite } from "./accept-invite";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/sign-in?invite=${id}`);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <AcceptInvite invitationId={id} />
    </div>
  );
}
