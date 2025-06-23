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
import { Loader2, Plus, Trophy } from "lucide-react"

// Challenge type definitions
const CHALLENGE_TYPES = [
  {
    id: 0,
    name: "1 Week Challenge",
    duration: "1 Week"
  },
  {
    id: 1,
    name: "1 Month Challenge",
    duration: "1 Month"
  },
  {
    id: 2,
    name: "3 Months Challenge",
    duration: "3 Months"
  },
  {
    id: 3,
    name: "6 Months Challenge",
    duration: "6 Months"
  },
  {
    id: 4,
    name: "1 Year Challenge",
    duration: "1 Year"
  }
];

interface ChallengeTypeModalProps {
  onCreateChallenge: (challengeType: number) => Promise<void>;
  isCreating: boolean;
  activeChallenges?: Array<{
    challengeType: number;
    status: "active" | "pending" | "completed" | "finished";
  }>;
}

export function ChallengeTypeModal({ onCreateChallenge, isCreating, activeChallenges = [] }: ChallengeTypeModalProps) {
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // Check if a challenge type is already active
  const isTypeActive = (challengeType: number) => {
    return activeChallenges.some(challenge => 
      challenge.challengeType === challengeType && challenge.status === "active"
    );
  };

  // Check if the selected type is active
  const selectedTypeIsActive = selectedType !== null ? isTypeActive(selectedType) : false;

  const handleCreate = async () => {
    if (selectedType !== null && !selectedTypeIsActive) {
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
        <Button 
          variant="default" 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-lg"
        >
          <Plus className="mr-3 h-5 w-5" />
          Create Challenge
          <Trophy className="ml-3 h-5 w-5" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Challenge</DialogTitle>
          <DialogDescription className="text-base">
            Select the type of challenge you want to create
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <RadioGroup 
            value={selectedType?.toString() || ""} 
            onValueChange={(value) => setSelectedType(parseInt(value))}
            className="space-y-3"
          >
            {CHALLENGE_TYPES.map((type) => {
              const typeIsActive = isTypeActive(type.id);
              return (
                <div
                  key={type.id}
                  className={`flex items-start space-x-2 rounded-md border p-3 ${
                    selectedType === type.id 
                      ? "border-primary bg-primary/5" 
                      : typeIsActive 
                      ? "border-muted bg-muted/20 opacity-50" 
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem 
                    value={type.id.toString()} 
                    id={`type-${type.id}`} 
                    className="mt-1"
                    disabled={typeIsActive}
                  />
                  <div className="flex-1 space-y-1">
                    <Label 
                      htmlFor={`type-${type.id}`} 
                      className={`flex items-center justify-between ${
                        typeIsActive ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className={`font-medium text-base ${typeIsActive ? "text-muted-foreground" : ""}`}>
                          {type.name}
                        </span>
                        {typeIsActive && (
                          <span className="text-sm text-orange-500 font-medium mt-1">
                            Already Active
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {type.duration}
                      </span>
                    </Label>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="text-base">
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={selectedType === null || isCreating || selectedTypeIsActive}
            className="text-base"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : selectedTypeIsActive ? (
              "Challenge Already Active"
            ) : (
              "Create Challenge"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 