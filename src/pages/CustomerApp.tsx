import { useState, useCallback, useEffect } from "react";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { UploadDropzone } from "@/components/upload/UploadDropzone";
import { PrintRecipeForm } from "@/components/print/PrintRecipeForm";
import { OrderSummary } from "@/components/print/OrderSummary";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PrintRecipe {
  pages: string;
  colorMode: "bw" | "color";
  sides: "single" | "double";
  copies: number;
}

interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  recipe?: PrintRecipe;
  priceCents: number;
  status: "uploading" | "uploaded" | "configuring" | "ready";
  uploadProgress?: number;
  storagePath?: string;
  totalPages?: number;
}

interface ChatEntry {
  id: string;
  type: "user" | "assistant" | "system";
  content: React.ReactNode;
  timestamp: string;
}

export default function CustomerApp() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentJobGroupId, setCurrentJobGroupId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([
    {
      id: "welcome",
      type: "assistant",
      content: (
        <div className="space-y-4">
          <p>Hi there! 👋 Welcome to QuickPrint Web!</p>
          <p>I'm here to help you print your documents quickly and easily.</p>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => handleUserChoice("upload")} variant="default">
              Upload Document
            </Button>
            <Button onClick={() => handleUserChoice("exit")} variant="outline">
              Exit
            </Button>
          </div>
        </div>
      ),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [configuringFileId, setConfiguringFileId] = useState<string | null>(null);
  const { toast } = useToast();

  const calculatePrice = useCallback((recipe: PrintRecipe, totalPages: number = 5): number => {
    const basePricePerPage = 10; // ₹0.10 per page
    const colorMultiplier = recipe.colorMode === "color" ? 2 : 1;
    const sidesMultiplier = recipe.sides === "double" ? 0.9 : 1;
    
    let pageCount = totalPages;
    if (recipe.pages !== "all") {
      // Count pages in custom range
      const pages = recipe.pages.split(',').map(p => p.trim());
      pageCount = 0;
      for (const page of pages) {
        if (page.includes('-')) {
          const [start, end] = page.split('-').map(Number);
          pageCount += (end - start + 1);
        } else {
          pageCount += 1;
        }
      }
    }
    
    return Math.round(basePricePerPage * pageCount * recipe.copies * colorMultiplier * sidesMultiplier);
  }, []);

  const handleUserChoice = useCallback((choice: "upload" | "exit") => {
    if (choice === "exit") {
      addChatMessage("assistant", "Thank you for visiting QuickPrint Web! Have a great day! 👋");
      return;
    }
    
    setShowUpload(true);
    addChatMessage("assistant", (
      <div className="space-y-2">
        <p>Great! Please upload your document(s) below.</p>
        <p className="text-xs text-muted-foreground">
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 100MB each)
        </p>
      </div>
    ));
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

  const handleFileUpload = useCallback(async (files: File[]) => {
    for (const file of files) {
      const fileId = crypto.randomUUID();
      
      const newFile: UploadedFile = {
        id: fileId,
        fileName: file.name,
        fileSize: file.size,
        priceCents: 0,
        status: "uploading",
        uploadProgress: 0,
        totalPages: Math.floor(Math.random() * 20) + 1 // Simulate page detection
      };

      setUploadedFiles(prev => [...prev, newFile]);
      addChatMessage("assistant", `📎 Uploading: ${file.name}...`);

      try {
        // Create job group if not exists
        if (!currentJobGroupId) {
          const { data: jobGroup, error: jobGroupError } = await supabase
            .from('job_groups')
            .insert({})
            .select()
            .single();
          
          if (jobGroupError) throw jobGroupError;
          setCurrentJobGroupId(jobGroup.id);
        }

        // Upload file to storage
        const storagePath = `jobs/${currentJobGroupId}/${fileId}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        // Insert job record
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            id: fileId,
            job_group_id: currentJobGroupId,
            file_name: file.name,
            file_size_bytes: file.size,
            storage_path: storagePath
          });

        if (jobError) throw jobError;

        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: "uploaded", uploadProgress: 100, storagePath }
            : f
        ));

        addChatMessage("assistant", `✅ Uploaded: ${file.name}`);
        
        setTimeout(() => {
          addChatMessage("assistant", `Great! I received "${file.name}". Now let's set up the print settings for this document.`);
          setConfiguringFileId(fileId);
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? { ...f, status: "configuring" } : f
          ));
        }, 500);

      } catch (error) {
        console.error('Upload error:', error);
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        toast({
          title: "Upload failed",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        });
      }
    }
  }, [currentJobGroupId, addChatMessage, toast]);

  const handleRecipeSubmit = useCallback(async (recipe: PrintRecipe) => {
    if (!configuringFileId) return;
    
    const file = uploadedFiles.find(f => f.id === configuringFileId);
    if (!file) return;

    try {
      const priceCents = calculatePrice(recipe, file.totalPages || 5);
      
      // Update job in database
      const { error } = await supabase
        .from('jobs')
        .update({
          pages: recipe.pages,
          color_mode: recipe.colorMode,
          sides: recipe.sides,
          copies: recipe.copies,
          price_cents: priceCents
        })
        .eq('id', configuringFileId);

      if (error) throw error;

      setUploadedFiles(prev => prev.map(f => 
        f.id === configuringFileId 
          ? { ...f, recipe, priceCents, status: "ready" }
          : f
      ));

      addChatMessage("assistant", (
        <div className="space-y-2">
          <p>✅ Recipe saved for {file.fileName}:</p>
          <ul className="text-sm space-y-1 list-disc list-inside ml-4">
            <li>Pages: {recipe.pages}</li>
            <li>Color: {recipe.colorMode === "bw" ? "Black & White" : "Color"}</li>
            <li>Sides: {recipe.sides === "single" ? "Single side" : "Double side"}</li>
            <li>Copies: {recipe.copies}</li>
          </ul>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setShowUpload(true)} variant="outline" size="sm">
              Upload Another Document
            </Button>
            <Button onClick={handleProceedToPayment} variant="default" size="sm">
              Proceed to Payment
            </Button>
          </div>
        </div>
      ));

      setConfiguringFileId(null);
    } catch (error) {
      console.error('Recipe update error:', error);
      toast({
        title: "Update failed",
        description: "Failed to save print settings. Please try again.",
        variant: "destructive",
      });
    }
  }, [configuringFileId, uploadedFiles, calculatePrice, addChatMessage, toast]);

  const handleRecipeCancel = useCallback(() => {
    setConfiguringFileId(null);
    addChatMessage("assistant", "Settings canceled. You can upload another document or configure this one later.");
  }, [addChatMessage]);

  const handleProceedToPayment = useCallback(() => {
    const readyFiles = uploadedFiles.filter(f => f.status === "ready");
    if (readyFiles.length === 0) return;

    const totalCents = readyFiles.reduce((sum, file) => sum + file.priceCents, 0);
    
    addChatMessage("assistant", (
      <div className="space-y-3">
        <p>🆔 JOB ID: {currentJobGroupId?.slice(-6).toUpperCase()}</p>
        <div className="bg-muted p-3 rounded-lg">
          {readyFiles.map((file, index) => (
            <div key={file.id} className="text-sm">
              {index + 1}. {file.fileName} → {file.recipe?.colorMode === "bw" ? "B/W" : "Color"} | {file.recipe?.sides === "single" ? "Single" : "Double"} side | {file.recipe?.pages} pages | {file.recipe?.copies} copy
            </div>
          ))}
          <p className="font-semibold mt-2">Total Cost: ₹{(totalCents / 100).toFixed(2)}</p>
        </div>
        <p>Please review your order summary below and proceed to payment.</p>
      </div>
    ));
  }, [uploadedFiles, currentJobGroupId, addChatMessage]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    try {
      // Delete from storage and database
      const file = uploadedFiles.find(f => f.id === fileId);
      if (file?.storagePath) {
        await supabase.storage.from('documents').remove([file.storagePath]);
      }
      await supabase.from('jobs').delete().eq('id', fileId);
      
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Remove file error:', error);
    }
  }, [uploadedFiles]);

  const handleConfirmPayment = useCallback(async () => {
    if (!currentJobGroupId) return;
    
    setIsProcessingPayment(true);
    
    try {
      const readyFiles = uploadedFiles.filter(f => f.status === "ready");
      const totalPrice = readyFiles.reduce((sum, file) => sum + file.priceCents, 0);
      
      // Update job group and jobs to paid status
      await supabase
        .from('job_groups')
        .update({ 
          payment_status: 'paid',
          total_price_cents: totalPrice
        })
        .eq('id', currentJobGroupId);

      await supabase
        .from('jobs')
        .update({ payment_status: 'paid' })
        .eq('job_group_id', currentJobGroupId);

      addChatMessage("assistant", (
        <div className="space-y-3">
          <p className="font-semibold text-green-600">✅ Payment received! Your order is in the queue!</p>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium">🆔 JOB ID: {currentJobGroupId.slice(-6).toUpperCase()}</p>
            
            <div className="mt-2 space-y-1">
              {readyFiles.map((file, index) => (
                <div key={file.id} className="text-sm">
                  {index + 1}. {file.fileName} → {file.recipe?.colorMode === "bw" ? "B/W" : "Color"} | {file.recipe?.sides === "single" ? "Single" : "Double"} side | {file.recipe?.pages} pages | {file.recipe?.copies} copy
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
        setCurrentJobGroupId(null);
        setShowUpload(false);
      }, 3000);

      toast({
        title: "Payment Successful!",
        description: `Job ID: ${currentJobGroupId.slice(-6).toUpperCase()} - Your documents are being processed.`,
      });
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  }, [currentJobGroupId, uploadedFiles, addChatMessage, toast]);

  const readyFiles = uploadedFiles.filter(f => f.status === "ready");
  const totalCents = readyFiles.reduce((sum, file) => sum + file.priceCents, 0);
  const canProceedToPayment = readyFiles.length > 0 && !isProcessingPayment && !configuringFileId;

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
        {showUpload && !configuringFileId && (
          <UploadDropzone 
            onFileUpload={handleFileUpload}
            disabled={isProcessingPayment}
          />
        )}

        {/* Recipe Configuration */}
        {configuringFileId && (
          <div className="flex justify-center">
            <PrintRecipeForm
              fileName={uploadedFiles.find(f => f.id === configuringFileId)?.fileName || ""}
              totalPages={uploadedFiles.find(f => f.id === configuringFileId)?.totalPages}
              onSubmit={handleRecipeSubmit}
              onCancel={handleRecipeCancel}
            />
          </div>
        )}

        {/* Order Summary */}
        {canProceedToPayment && (
          <OrderSummary
            items={readyFiles.map(file => ({
              id: file.id,
              fileName: file.fileName,
              recipe: file.recipe!,
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