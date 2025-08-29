import { CreditCard, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PrintRecipe } from "./FileCard";

interface OrderItem {
  id: string;
  fileName: string;
  recipe: PrintRecipe;
  priceCents: number;
}

interface OrderSummaryProps {
  items: OrderItem[];
  totalCents: number;
  onConfirmPayment: () => void;
  isProcessing?: boolean;
  className?: string;
}

export function OrderSummary({ 
  items, 
  totalCents, 
  onConfirmPayment, 
  isProcessing = false,
  className 
}: OrderSummaryProps) {
  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const getRecipeString = (recipe: PrintRecipe) => {
    const color = recipe.colorMode === "bw" ? "B/W" : "Color";
    const sides = recipe.sides === "single" ? "Single" : "Double";
    return `${color} | ${sides} side | ${recipe.pages} pages | ${recipe.copies} copy`;
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Order Items */}
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <span className="text-sm font-medium truncate">
                      {item.fileName}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1">
                    {getRecipeString(item.recipe)}
                  </div>
                </div>
                
                <div className="text-sm font-semibold text-right">
                  {formatPrice(item.priceCents)}
                </div>
              </div>
              
              {index < items.length - 1 && <Separator />}
            </div>
          ))}
        </div>
        
        <Separator />
        
        {/* Total */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Printing Cost:</span>
            <span className="font-medium">{formatPrice(totalCents - 100)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Platform Fee:</span>
            <span className="font-medium">₹1.00</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-semibold text-lg">Total Cost:</span>
            <span className="text-xl font-bold text-primary">
              {formatPrice(totalCents)}
            </span>
          </div>
        </div>
        
        {/* Payment Button */}
        <div className="pt-4">
          <Button
            onClick={onConfirmPayment}
            disabled={isProcessing}
            size="lg"
            className="w-full"
            variant="hero"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay ₹{(totalCents / 100).toFixed(2)} (Demo)
              </>
            )}
          </Button>
          
            <p className="text-xs text-muted-foreground text-center mt-2">
              <Clock className="w-3 h-3 inline mr-1" />
              Click to simulate payment (Demo mode)
            </p>
        </div>
      </CardContent>
    </Card>
  );
}