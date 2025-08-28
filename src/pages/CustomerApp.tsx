import { useState, useCallback } from "react";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { FileCard, PrintRecipe } from "@/components/print/FileCard";
import { OrderSummary } from "@/components/print/OrderSummary";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  file: File;
  recipe: PrintRecipe;
  priceCents: number;
  status: "uploading" | "ready" | "processing";
  uploadProgress?: number;
}

interface ChatEntry {
  id: string;
  type: "user" | "assistant" | "system";
  content: React.ReactNode;
  timestamp: string;
}

export default function CustomerApp() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([
    {
      id: "welcome",
      type: "assistant",
      content: (
        <div className="space-y-2">
          <p>Hi there! 👋 Welcome to QuickPrint Web!</p>
          <p>I'm here to help you print your documents quickly and easily. Please upload your document(s) to start printing.</p>
          <p className="text-xs text-muted-foreground">
            Supported formats: PDF, DOC, DOCX, JPG, PNG
          </p>
        </div>
      ),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const calculatePrice = useCallback((recipe: PrintRecipe, estimatedPages: number = 5): number => {
    const basePricePerPage = 10; // ₹0.10 per page
    const colorMultiplier = recipe.colorMode === "color" ? 2 : 1;
    const sidesMultiplier = recipe.sides === "double" ? 0.9 : 1;
    const pages = recipe.pages === "all" ? estimatedPages : 1; // Simplified
    
    return Math.round(basePricePerPage * pages * recipe.copies * colorMultiplier * sidesMultiplier);
  }, []);

  const addChatMessage = useCallback((type: "user" | "assistant" | "system", content: React.ReactNode) => {
    const newMessage: ChatEntry = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, newMessage]);
  }, []);

  const handleFileUpload = useCallback((files: File[]) => {
    files.forEach((file, index) => {
      const fileId = `${Date.now()}-${index}`;
      const defaultRecipe: PrintRecipe = {
        pages: "all",
        colorMode: "bw",
        sides: "single",
        copies: 1
      };
      
      const newFile: UploadedFile = {
        id: fileId,
        file,
        recipe: defaultRecipe,
        priceCents: calculatePrice(defaultRecipe),
        status: "uploading",
        uploadProgress: 0
      };

      setUploadedFiles(prev => [...prev, newFile]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: "ready", uploadProgress: undefined }
              : f
          ));

          // Add chat messages
          addChatMessage("assistant", `📎 Uploaded: ${file.name}`);
          
          setTimeout(() => {
            addChatMessage("assistant", (
              <div className="space-y-2">
                <p>Great! I received "{file.name}". Now let's set up the print settings for this document.</p>
              </div>
            ));
          }, 500);

          setTimeout(() => {
            addChatMessage("assistant", (
              <div className="space-y-2">
                <p>✅ Recipe saved for {file.name}:</p>
                <ul className="text-sm space-y-1 list-disc list-inside ml-4">
                  <li>Pages: all</li>
                  <li>Color: Black & White</li>
                  <li>Sides: Single side</li>
                  <li>Copies: 1</li>
                </ul>
                <p>Do you want to upload another document or proceed to payment?</p>
              </div>
            ));
          }, 1500);
        } else {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, uploadProgress: Math.round(progress) }
              : f
          ));
        }
      }, 100);
    });
  }, [calculatePrice, addChatMessage]);

  const handleRecipeChange = useCallback((fileId: string, newRecipe: PrintRecipe) => {
    setUploadedFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, recipe: newRecipe, priceCents: calculatePrice(newRecipe) }
        : file
    ));

    const file = uploadedFiles.find(f => f.id === fileId);
    if (file) {
      addChatMessage("assistant", `✅ Recipe updated for ${file.file.name}`);
    }
  }, [uploadedFiles, calculatePrice, addChatMessage]);

  const handleRemoveFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  const handleConfirmPayment = useCallback(async () => {
    setIsProcessingPayment(true);
    
    // Simulate payment processing
    setTimeout(() => {
      const jobId = `QP-${Date.now().toString().slice(-6)}`;
      setCurrentJobId(jobId);
      setIsProcessingPayment(false);
      
      const totalPrice = uploadedFiles.reduce((sum, file) => sum + file.priceCents, 0);
      
      addChatMessage("assistant", (
        <div className="space-y-3">
          <p className="font-semibold text-green-600">✅ Payment received! Your order is in the queue!</p>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium">🆔 JOB ID: {jobId}</p>
            
            <div className="mt-2 space-y-1">
              {uploadedFiles.map((file, index) => (
                <div key={file.id} className="text-sm">
                  {index + 1}. {file.file.name} → {file.recipe.colorMode === "bw" ? "B/W" : "Color"} | {file.recipe.sides === "single" ? "Single" : "Double"} side | {file.recipe.pages} pages | {file.recipe.copies} copy
                </div>
              ))}
            </div>
            
            <p className="font-semibold mt-2">Total Cost: ₹{(totalPrice / 100).toFixed(2)}</p>
          </div>
          
          <div className="space-y-1">
            <p>Status: Processing</p>
            <p className="text-sm text-muted-foreground">
              You will be notified when your documents are ready for pickup.
            </p>
            <p className="text-sm text-muted-foreground">
              Your job has been sent to the shopkeeper dashboard.
            </p>
          </div>
        </div>
      ));

      setTimeout(() => {
        addChatMessage("assistant", "Ready for your next print job! Feel free to upload more documents.");
        setUploadedFiles([]);
        setCurrentJobId(null);
      }, 3000);

      toast({
        title: "Payment Successful!",
        description: `Job ID: ${jobId} - Your documents are being processed.`,
      });
    }, 2000);
  }, [uploadedFiles, addChatMessage, toast]);

  const readyFiles = uploadedFiles.filter(f => f.status === "ready");
  const totalCents = readyFiles.reduce((sum, file) => sum + file.priceCents, 0);
  const canProceedToPayment = readyFiles.length > 0 && !isProcessingPayment && !currentJobId;

  return (
    <ChatLayout>
      <div className="space-y-6">
        {/* Chat History */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {chatHistory.map((entry) => (
            <ChatMessage
              key={entry.id}
              type={entry.type}
              timestamp={entry.timestamp}
            >
              {entry.content}
            </ChatMessage>
          ))}
        </div>

        {/* File Upload */}
        {!currentJobId && (
          <UploadDropzone 
            onFileUpload={handleFileUpload}
            disabled={isProcessingPayment}
          />
        )}

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Uploaded Documents</h3>
            <div className="grid gap-4">
              {uploadedFiles.map((file) => (
                <FileCard
                  key={file.id}
                  id={file.id}
                  fileName={file.file.name}
                  fileSize={file.file.size}
                  recipe={file.recipe}
                  priceCents={file.priceCents}
                  status={file.status}
                  uploadProgress={file.uploadProgress}
                  onRecipeChange={(recipe) => handleRecipeChange(file.id, recipe)}
                  onRemove={() => handleRemoveFile(file.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Order Summary */}
        {canProceedToPayment && (
          <OrderSummary
            items={readyFiles.map(file => ({
              id: file.id,
              fileName: file.file.name,
              recipe: file.recipe,
              priceCents: file.priceCents
            }))}
            totalCents={totalCents}
            onConfirmPayment={handleConfirmPayment}
            isProcessing={isProcessingPayment}
          />
        )}
      </div>
    </ChatLayout>
  );
}