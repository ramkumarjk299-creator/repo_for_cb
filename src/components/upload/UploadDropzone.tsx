import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UploadDropzoneProps {
  onFileUpload: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

export function UploadDropzone({ 
  onFileUpload, 
  maxFiles = 10, 
  maxSize = 100 * 1024 * 1024, // 100MB
  disabled = false,
  className 
}: UploadDropzoneProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadError(null);
    
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setUploadError(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`);
      } else if (error.code === 'file-invalid-type') {
        setUploadError('Invalid file type. Supported: PDF, DOC, DOCX, JPG, PNG');
      } else {
        setUploadError('Error uploading file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles);
    }
  }, [onFileUpload, maxSize]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize,
    maxFiles,
    disabled,
    multiple: true
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragActive && !isDragReject && "border-border"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center transition-colors",
            isDragActive && !isDragReject && "bg-primary text-primary-foreground",
            isDragReject && "bg-destructive text-destructive-foreground",
            !isDragActive && !isDragReject && "bg-muted text-muted-foreground"
          )}>
            {isDragReject ? (
              <AlertCircle className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {isDragActive 
                ? isDragReject 
                  ? "Invalid file type" 
                  : "Drop files here"
                : "Upload Documents"
              }
            </h3>
            
            <p className="text-muted-foreground text-sm">
              {isDragActive 
                ? isDragReject
                  ? "Please use supported file types"
                  : "Release to upload"
                : "Drag & drop files here or click to browse"
              }
            </p>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>PDF, DOC, DOCX, JPG, PNG • Max {Math.round(maxSize / 1024 / 1024)}MB each</span>
            </div>
          </div>
          
          {!isDragActive && (
            <Button variant="outline" size="sm" disabled={disabled}>
              <Upload className="w-4 h-4 mr-2" />
              Browse Files
            </Button>
          )}
        </div>
      </div>
      
      {uploadError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{uploadError}</span>
        </div>
      )}
    </div>
  );
}