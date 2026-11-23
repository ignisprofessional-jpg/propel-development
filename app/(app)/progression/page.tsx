import { PageHeader } from "@/components/ui";
import { getDict } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/dictionaries";
import { syncTree } from "@/lib/game/data";
import { TreeView } from "./TreeView";

export const metadata = { title: "Arbre de progression" };

export default async function ProgressionPage() {
  const [t, tree] = await Promise.all([getDict(), syncTree()]);
  return (
    <>
      <PageHeader kicker={t.nav.game} title={t.nav.tree} sub={format(t.tree.done, { n: tree.done, total: tree.total })} />
      <TreeView tree={tree} />
    </>
  );
}
