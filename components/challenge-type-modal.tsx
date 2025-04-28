"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

// Challenge type definitions
const CHALLENGE_TYPES = [
  {
    id: 0,
    name: "One Week Challenge",
    duration: "1 Week"
  },
  {
    id: 1,
    name: "One Month Challenge",
    duration: "1 Month"
  },
  {
    id: 2,
    name: "Three Month Challenge",
    duration: "3 Months"
  },
  {
    id: 3,
    name: "Six Month Challenge",
    duration: "6 Months"
  },
  {
    id: 4,
    name: "One Year Challenge",
    duration: "1 Year"
  }
];

interface ChallengeTypeModalProps {
  onCreateChallenge: (challengeType: number) => Promise<void>;
  isCreating: boolean;
}

export function ChallengeTypeModal({ onCreateChallenge, isCreating }: ChallengeTypeModalProps) {
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const handleCreate = async () => {
    if (selectedType !== null) {
      try {
        await onCreateChallenge(selectedType);
        // Close the modal when transaction is confirmed or rejected
        setOpen(false);
      } catch (error) {
        // Keep the modal open if there's an error to allow retrying
        console.error("Error creating challenge:", error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Create Challenge
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Challenge</DialogTitle>
          <DialogDescription>
            Select the type of challenge you want to create
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            value={selectedType?.toString() || ""} 
            onValueChange={(value) => setSelectedType(parseInt(value))}
            className="space-y-3"
          >
            {CHALLENGE_TYPES.map((type) => (
              <div
                key={type.id}
                className={`flex items-start space-x-2 rounded-md border p-3 ${
                  selectedType === type.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <RadioGroupItem value={type.id.toString()} id={`type-${type.id}`} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label 
                    htmlFor={`type-${type.id}`} 
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-medium">{type.name}</span>
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {type.duration}
                    </span>
                  </Label>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={selectedType === null || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : "Create Challenge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 