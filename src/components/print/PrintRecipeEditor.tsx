import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { PrintRecipe } from "./FileCard";

interface PrintRecipeEditorProps {
  recipe: PrintRecipe;
  onChange: (recipe: PrintRecipe) => void;
  onClose: () => void;
}

export function PrintRecipeEditor({ recipe, onChange, onClose }: PrintRecipeEditorProps) {
  const [localRecipe, setLocalRecipe] = useState(recipe);

  const handleSave = () => {
    onChange(localRecipe);
    onClose();
  };

  const handleCancel = () => {
    setLocalRecipe(recipe);
    onClose();
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <h4 className="font-medium text-sm">Print Settings</h4>
      
      {/* Pages */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Pages</Label>
        <div className="flex gap-2">
          <Button
            variant={localRecipe.pages === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setLocalRecipe({ ...localRecipe, pages: "all" })}
            className="text-xs"
          >
            All
          </Button>
          <Input
            placeholder="e.g. 1-5, 8, 10-12"
            value={localRecipe.pages === "all" ? "" : localRecipe.pages}
            onChange={(e) => setLocalRecipe({ ...localRecipe, pages: e.target.value || "all" })}
            className="text-xs h-8"
          />
        </div>
      </div>

      {/* Color Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Color</Label>
        <RadioGroup
          value={localRecipe.colorMode}
          onValueChange={(value: "bw" | "color") => 
            setLocalRecipe({ ...localRecipe, colorMode: value })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="bw" id="bw" />
            <Label htmlFor="bw" className="text-xs">Black & White</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="color" id="color" />
            <Label htmlFor="color" className="text-xs">Color</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Sides */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Sides</Label>
        <RadioGroup
          value={localRecipe.sides}
          onValueChange={(value: "single" | "double") => 
            setLocalRecipe({ ...localRecipe, sides: value })
          }
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="single" id="single" />
            <Label htmlFor="single" className="text-xs">Single side</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="double" id="double" />
            <Label htmlFor="double" className="text-xs">Double side</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Copies */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Copies</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalRecipe({ 
              ...localRecipe, 
              copies: Math.max(1, localRecipe.copies - 1) 
            })}
            className="h-8 w-8 p-0"
          >
            -
          </Button>
          <Input
            type="number"
            min="1"
            max="100"
            value={localRecipe.copies}
            onChange={(e) => setLocalRecipe({ 
              ...localRecipe, 
              copies: Math.max(1, parseInt(e.target.value) || 1) 
            })}
            className="text-center h-8 w-16"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocalRecipe({ 
              ...localRecipe, 
              copies: Math.min(100, localRecipe.copies + 1) 
            })}
            className="h-8 w-8 p-0"
          >
            +
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          className="flex-1 text-xs"
        >
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCancel}
          className="flex-1 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}