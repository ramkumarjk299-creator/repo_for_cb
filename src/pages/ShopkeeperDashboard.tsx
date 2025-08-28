import { useState } from "react";
import { Calendar, Download, Settings, Trash2, CheckCircle, Clock, FileText, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface JobFile {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  recipe: {
    pages: string;
    colorMode: "bw" | "color";
    sides: "single" | "double";
    copies: number;
  };
  priceCents: number;
  status: "queued" | "processing" | "printed" | "ready";
}

interface JobGroup {
  id: string;
  userLabel?: string;
  totalPriceCents: number;
  paymentStatus: "paid";
  createdAt: string;
  files: JobFile[];
}

// Demo data
const demoJobs: JobGroup[] = [
  {
    id: "QP-789123",
    userLabel: "John Doe",
    totalPriceCents: 2500,
    paymentStatus: "paid",
    createdAt: "2024-01-15T10:30:00Z",
    files: [
      {
        id: "file1",
        fileName: "business_proposal.pdf",
        fileSizeBytes: 2048000,
        recipe: { pages: "all", colorMode: "bw", sides: "double", copies: 2 },
        priceCents: 1500,
        status: "queued"
      },
      {
        id: "file2", 
        fileName: "charts.png",
        fileSizeBytes: 512000,
        recipe: { pages: "all", colorMode: "color", sides: "single", copies: 1 },
        priceCents: 1000,
        status: "queued"
      }
    ]
  },
  {
    id: "QP-456789",
    userLabel: "Sarah Wilson",
    totalPriceCents: 800,
    paymentStatus: "paid",
    createdAt: "2024-01-15T11:15:00Z",
    files: [
      {
        id: "file3",
        fileName: "resume.docx",
        fileSizeBytes: 128000,
        recipe: { pages: "all", colorMode: "bw", sides: "single", copies: 5 },
        priceCents: 800,
        status: "processing"
      }
    ]
  }
];

export default function ShopkeeperDashboard() {
  const [jobs, setJobs] = useState<JobGroup[]>(demoJobs);
  const [selectedTab, setSelectedTab] = useState("today");
  const { toast } = useToast();

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued": return "bg-status-queued";
      case "processing": return "bg-status-processing";
      case "printed": return "bg-status-printed";
      case "ready": return "bg-status-ready";
      default: return "bg-muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued": return <Clock className="w-4 h-4" />;
      case "processing": return <Settings className="w-4 h-4 animate-spin" />;
      case "printed": return <CheckCircle className="w-4 h-4" />;
      case "ready": return <CheckCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleDownloadFile = (jobId: string, fileId: string, fileName: string) => {
    // In real app, this would call the API to get signed download URL
    toast({
      title: "Download Started",
      description: `Downloading ${fileName}...`,
    });
  };

  const handleUpdateFileStatus = (jobId: string, fileId: string, newStatus: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? {
            ...job,
            files: job.files.map(file => 
              file.id === fileId 
                ? { ...file, status: newStatus as any }
                : file
            )
          }
        : job
    ));

    toast({
      title: "Status Updated",
      description: `File marked as ${newStatus}`,
    });
  };

  const handleEODCleanup = () => {
    const today = new Date().toISOString().split('T')[0];
    const totalJobs = jobs.length;
    const totalFiles = jobs.reduce((sum, job) => sum + job.files.length, 0);
    const totalIncome = jobs.reduce((sum, job) => sum + job.totalPriceCents, 0);

    // In real app, this would call the API
    setJobs([]);
    
    toast({
      title: "End of Day Complete",
      description: `Archived ${totalJobs} jobs (${totalFiles} files) worth ${formatPrice(totalIncome)}`,
    });
  };

  const todayStats = {
    totalJobs: jobs.length,
    totalFiles: jobs.reduce((sum, job) => sum + job.files.length, 0),
    totalIncome: jobs.reduce((sum, job) => sum + job.totalPriceCents, 0),
    totalCustomers: new Set(jobs.map(job => job.userLabel)).size
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            QuickPrint Dashboard
          </h1>
          <p className="text-muted-foreground">
            Shopkeeper control panel
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Jobs</p>
                  <p className="text-2xl font-bold">{todayStats.totalJobs}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Clock className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Files to Print</p>
                  <p className="text-2xl font-bold">{todayStats.totalFiles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-status-printed/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-status-printed" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Today's Revenue</p>
                  <p className="text-2xl font-bold">{formatPrice(todayStats.totalIncome)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-status-processing/10 rounded-lg">
                  <Users className="w-5 h-5 text-status-processing" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customers</p>
                  <p className="text-2xl font-bold">{todayStats.totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="today">Today's Jobs</TabsTrigger>
              <TabsTrigger value="eod">End of Day</TabsTrigger>
            </TabsList>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  EOD Cleanup
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>End of Day Cleanup</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive today's statistics and permanently delete all job records and files. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEODCleanup}>
                    Confirm Cleanup
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <TabsContent value="today" className="space-y-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No jobs today</h3>
                  <p className="text-muted-foreground">Jobs will appear here when customers place orders</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {jobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">Job {job.id}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {job.userLabel && `Customer: ${job.userLabel} • `}
                            {new Date(job.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(job.totalPriceCents)}
                          </p>
                          <Badge variant="secondary" className="bg-status-printed text-white">
                            {job.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {job.files.map((file) => (
                        <div key={file.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{file.fileName}</h4>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.fileSizeBytes)} • 
                                {file.recipe.colorMode === "bw" ? " B&W" : " Color"} • 
                                {file.recipe.sides === "single" ? " Single" : " Double"} side • 
                                {file.recipe.pages} pages • 
                                {file.recipe.copies} copies
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary" 
                                className={`text-white ${getStatusColor(file.status)}`}
                              >
                                {getStatusIcon(file.status)}
                                <span className="ml-1">{file.status}</span>
                              </Badge>
                              <span className="font-semibold text-sm">
                                {formatPrice(file.priceCents)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(job.id, file.id, file.fileName)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                            
                            {file.status === "queued" && (
                              <Button
                                variant="print"
                                size="sm"
                                onClick={() => handleUpdateFileStatus(job.id, file.id, "processing")}
                              >
                                Start Processing
                              </Button>
                            )}
                            
                            {file.status === "processing" && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleUpdateFileStatus(job.id, file.id, "printed")}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Printed
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="eod" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{todayStats.totalJobs}</p>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-accent">{todayStats.totalFiles}</p>
                    <p className="text-sm text-muted-foreground">Files Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-status-printed">{formatPrice(todayStats.totalIncome)}</p>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-status-processing">{todayStats.totalCustomers}</p>
                    <p className="text-sm text-muted-foreground">Customers</p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground text-center">
                  Use the "EOD Cleanup" button to archive these statistics and clear today's records.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}