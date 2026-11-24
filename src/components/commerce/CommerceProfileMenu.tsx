import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
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
  const { resolvedTheme, setTheme } = useTheme();
  const sombre = resolvedTheme === "dark";
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
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-transparent bg-transparent p-0 shadow-none sm:rounded-md sm:border-border/60 sm:bg-background/95 sm:shadow-xs transition-colors hover:bg-muted/70 lg:h-10 lg:w-auto lg:justify-start lg:gap-2.5 lg:px-2.5",
            className,
          )}
        >
          <Avatar className="h-7 w-7 lg:h-8 lg:w-8">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary lg:text-sm">
              {prenom ? prenom.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-1 text-left lg:block">
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
        {/* Sur mobile, le choix du thème est ici (pas de place dans l'en-tête). */}
        <DropdownMenuItem
          onClick={() => setTheme(sombre ? "light" : "dark")}
          className="flex cursor-pointer items-center gap-2 sm:hidden"
        >
          {sombre ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {sombre ? "Thème clair" : "Thème sombre"}
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
