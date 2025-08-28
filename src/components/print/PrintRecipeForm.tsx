import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { FileText } from "lucide-react";

interface PrintRecipe {
  pages: string;
  colorMode: "bw" | "color";
  sides: "single" | "double";
  copies: number;
}

interface PrintRecipeFormProps {
  fileName: string;
  totalPages?: number;
  onSubmit: (recipe: PrintRecipe) => void;
  onCancel: () => void;
}

export function PrintRecipeForm({ fileName, totalPages, onSubmit, onCancel }: PrintRecipeFormProps) {
  const [recipe, setRecipe] = useState<PrintRecipe>({
    pages: "all",
    colorMode: "bw",
    sides: "single",
    copies: 1
  });
  const [customPages, setCustomPages] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const validateAndSubmit = () => {
    const newErrors: string[] = [];
    
    // Validate pages
    if (recipe.pages === "custom") {
      if (!customPages.trim()) {
        newErrors.push("Please specify page range");
      } else if (totalPages) {
        const pagePattern = /^(\d+(-\d+)?,?\s*)+$/;
        if (!pagePattern.test(customPages.trim())) {
          newErrors.push("Invalid page format. Use format like: 1-5, 7, 10-12");
        } else {
          // Validate page numbers are within range
          const pages = customPages.split(',').map(p => p.trim());
          for (const page of pages) {
            if (page.includes('-')) {
              const [start, end] = page.split('-').map(Number);
              if (start > totalPages || end > totalPages || start < 1 || end < 1) {
                newErrors.push(`Page numbers must be between 1 and ${totalPages}`);
                break;
              }
            } else {
              const pageNum = Number(page);
              if (pageNum > totalPages || pageNum < 1) {
                newErrors.push(`Page numbers must be between 1 and ${totalPages}`);
                break;
              }
            }
          }
        }
      }
    }

    // Validate copies
    if (recipe.copies < 1 || recipe.copies > 100) {
      newErrors.push("Copies must be between 1 and 100");
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalRecipe = {
      ...recipe,
      pages: recipe.pages === "custom" ? customPages.trim() : recipe.pages
    };

    onSubmit(finalRecipe);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Configure Print Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">File: {fileName}</p>
        {totalPages && (
          <p className="text-xs text-muted-foreground">Total pages: {totalPages}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Color Mode */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Color Mode</Label>
          <RadioGroup
            value={recipe.colorMode}
            onValueChange={(value: "bw" | "color") => 
              setRecipe(prev => ({ ...prev, colorMode: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bw" id="bw" />
              <Label htmlFor="bw">Black & White</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="color" id="color" />
              <Label htmlFor="color">Color</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Page Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Pages to Print</Label>
          <RadioGroup
            value={recipe.pages}
            onValueChange={(value) => setRecipe(prev => ({ ...prev, pages: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" />
              <Label htmlFor="all">All Pages</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Custom Range</Label>
            </div>
          </RadioGroup>
          
          {recipe.pages === "custom" && (
            <Input
              placeholder="e.g., 1-5, 7, 10-12"
              value={customPages}
              onChange={(e) => setCustomPages(e.target.value)}
              className="mt-2"
            />
          )}
        </div>

        {/* Sides */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Print Sides</Label>
          <RadioGroup
            value={recipe.sides}
            onValueChange={(value: "single" | "double") => 
              setRecipe(prev => ({ ...prev, sides: value }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="single" id="single" />
              <Label htmlFor="single">Single Side</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="double" id="double" />
              <Label htmlFor="double">Double Side</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Copies */}
        <div className="space-y-3">
          <Label htmlFor="copies" className="text-sm font-medium">Number of Copies</Label>
          <Input
            id="copies"
            type="number"
            min="1"
            max="100"
            value={recipe.copies}
            onChange={(e) => setRecipe(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={validateAndSubmit} className="flex-1">
            Save Settings
          </Button>
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}