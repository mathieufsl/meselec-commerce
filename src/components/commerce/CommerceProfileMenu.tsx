import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCommerceAuth } from "@/hooks/useCommerceAuth";
import { useCommerceProfile } from "@/hooks/useCommerceProfile";
import { getPrenom } from "@/lib/userDisplay";
import { cn } from "@/lib/utils";

export function CommerceProfileMenu({ className }: { className?: string }) {
  const { user, signOut } = useCommerceAuth();
  const navigate = useNavigate();
  const { displayName: profileDisplayName } = useCommerceProfile(user?.id);
  const prenom = profileDisplayName?.split(/\s+/)[0] || profileDisplayName || getPrenom(user);

  const handleSignOut = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex h-10 items-center justify-start gap-2.5 rounded-md border-border/60 bg-background/95 px-2.5 transition-colors hover:bg-muted/70",
            className,
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
              {prenom ? prenom.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-sm font-medium">{prenom || "Profil"}</div>
            <div className="truncate text-xs text-muted-foreground">Compte</div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link to="/profil" className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin" className="flex cursor-pointer items-center gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleSignOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
