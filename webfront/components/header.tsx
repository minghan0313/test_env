import { Bell, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="px-4 py-3 flex items-center justify-between border-b border-border/50">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Emission Monitor</h1>
        <p className="text-xs text-muted-foreground">Plant A • Today</p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
