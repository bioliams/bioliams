import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/initials";
import { getT } from "@/i18n/server";

/** A person as they appear in histories: tiny avatar plus name. Server-only. */
export async function ActorChip({
  name,
  image,
}: {
  name: string | null;
  image?: string | null;
}) {
  const display = name ?? (await getT())("misc.actor.system");
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <Avatar className="size-4.5">
        {image && <AvatarImage src={image} alt="" />}
        <AvatarFallback className="bg-accent text-[8px] font-semibold text-accent-foreground">
          {name ? initials(name) : "•"}
        </AvatarFallback>
      </Avatar>
      {display}
    </span>
  );
}
