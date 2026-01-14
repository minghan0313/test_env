"use client"

import { Target } from "lucide-react"
import { Button } from "@/components/ui/button"

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-4 safe-area-bottom">
      <Button
        size="lg"
        onClick={onClick}
        className="h-14 w-14 rounded-full shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground"
        aria-label="Adjust daily target"
      >
        <Target className="h-6 w-6" />
      </Button>
    </div>
  )
}
