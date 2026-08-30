import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAoComments } from "@/hooks/useAoComments";
import { cn } from "@/lib/utils";

function CommentItem({
  authorPrenom,
  authorNom,
  body,
  createdAt,
}: {
  authorPrenom: string;
  authorNom: string;
  body: string;
  createdAt: string;
}) {
  const author =
    [authorPrenom, authorNom].filter(Boolean).join(" ").trim() || "Utilisateur";
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs font-semibold">{author}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr })}
      </p>
    </div>
  );
}

type AoCommentsSheetProps = {
  aoId: string;
  commentCount?: number;
  className?: string;
};

export function AoCommentsSheet({ aoId, commentCount, className }: AoCommentsSheetProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { comments, loading, posting, postComment } = useAoComments(aoId, open);

  async function handleSubmit() {
    const body = draft.trim();
    if (!body || posting) return;
    await postComment(body);
    setDraft("");
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className={cn("gap-1.5", className)}>
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Commentaires</span>
          {(commentCount ?? comments.length) > 0 ? (
            <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {commentCount ?? comments.length}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Discussion</SheetTitle>
          <SheetDescription>
            Commentaires partagés sur cet appel d&apos;offres.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 pt-4">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Aucun commentaire — soyez le premier à écrire.
              </p>
            ) : (
              comments.map((c) => (
                <CommentItem
                  key={c.id}
                  authorPrenom={c.author_prenom}
                  authorNom={c.author_nom}
                  body={c.body}
                  createdAt={c.created_at}
                />
              ))
            )}
          </div>

          <div className="shrink-0 space-y-2 border-t pt-3">
            <Textarea
              placeholder="Écrire un commentaire…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <Button
              size="sm"
              className="w-full gap-1.5"
              disabled={!draft.trim() || posting}
              onClick={() => void handleSubmit()}
            >
              {posting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
