import { useState } from "react";
import { FileText, Settings, Trash2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PrintRecipeEditor } from "./PrintRecipeEditor";

export interface PrintRecipe {
  pages: string;
  colorMode: "bw" | "color";
  sides: "single" | "double";
  copies: number;
}

interface FileCardProps {
  id: string;
  fileName: string;
  fileSize: number;
  recipe: PrintRecipe;
  priceCents: number;
  status: "uploading" | "ready" | "processing";
  uploadProgress?: number;
  onRecipeChange: (recipe: PrintRecipe) => void;
  onRemove: () => void;
  className?: string;
}

export function FileCard({
  id,
  fileName,
  fileSize,
  recipe,
  priceCents,
  status,
  uploadProgress,
  onRecipeChange,
  onRemove,
  className
}: FileCardProps) {
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const getStatusColor = () => {
    switch (status) {
      case "uploading": return "bg-status-processing";
      case "ready": return "bg-status-printed";
      case "processing": return "bg-status-queued";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "uploading": return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
      case "ready": return <CheckCircle className="w-4 h-4" />;
      case "processing": return <Settings className="w-4 h-4 animate-spin" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-card-hover border-border/50",
      status === "uploading" && "opacity-75",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{fileName}</h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(fileSize)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={cn("text-white text-xs", getStatusColor())}
            >
              <span className="mr-1">{getStatusIcon()}</span>
              {status === "uploading" && uploadProgress ? `${uploadProgress}%` : status}
            </Badge>
            
            {status === "ready" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {status === "uploading" && uploadProgress !== undefined && (
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Recipe Summary */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">{recipe.pages} pages</Badge>
            <Badge variant="outline">{recipe.colorMode === "bw" ? "B&W" : "Color"}</Badge>
            <Badge variant="outline">{recipe.sides === "single" ? "Single" : "Double"} side</Badge>
            <Badge variant="outline">{recipe.copies} copies</Badge>
          </div>
          
          {/* Price and Actions */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-primary">
              {formatPrice(priceCents)}
            </span>
            
            {status === "ready" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecipeEditor(!showRecipeEditor)}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Edit Recipe
              </Button>
            )}
          </div>
          
          {/* Recipe Editor */}
          {showRecipeEditor && status === "ready" && (
            <div className="pt-3 border-t">
              <PrintRecipeEditor
                recipe={recipe}
                onChange={onRecipeChange}
                onClose={() => setShowRecipeEditor(false)}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}