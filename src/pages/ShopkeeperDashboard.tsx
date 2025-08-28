import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileText, Download, CheckCircle, Clock, DollarSign, Users, Calendar, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  job_group_id: string;
  file_name: string;
  file_size_bytes: number;
  storage_path: string;
  pages: string;
  color_mode: "bw" | "color";
  sides: "single" | "double";
  copies: number;
  price_cents: number;
  payment_status: string;
  status: "queued" | "processing" | "printed" | "ready";
  created_at: string;
}

interface JobGroup {
  id: string;
  user_label: string | null;
  total_price_cents: number;
  payment_status: string;
  created_at: string;
  jobs: Job[];
}

export default function ShopkeeperDashboard() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadJobGroups();
  }, []);

  const loadJobGroups = async () => {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('job_groups')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false });

      if (jobsError) throw jobsError;

      const groupsWithJobs = groups.map(group => ({
        ...group,
        jobs: jobs.filter(job => job.job_group_id === group.id).map(job => ({
          ...job,
          color_mode: job.color_mode as "bw" | "color",
          sides: job.sides as "single" | "double",
          status: job.status as "queued" | "processing" | "printed" | "ready"
        }))
      }));

      setJobGroups(groupsWithJobs);
    } catch (error) {
      console.error('Error loading job groups:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs. Please refresh the page.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: Job["status"]) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      setJobGroups(prev => 
        prev.map(group => ({
          ...group,
          jobs: group.jobs.map(job => 
            job.id === jobId ? { ...job, status: newStatus } : job
          )
        }))
      );

      toast({
        title: "Status updated",
        description: `Job marked as ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const downloadFile = async (job: Job) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(job.storage_path, 3600); // 1 hour expiry

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error", 
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const runEOD = async () => {
    if (!confirm("This will archive today's jobs and delete all data. Continue?")) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Calculate daily summary
      const todayJobs = jobGroups.filter(group => 
        group.created_at.startsWith(today)
      );
      
      const totalDocs = todayJobs.reduce((sum, group) => sum + group.jobs.length, 0);
      const totalIncome = todayJobs.reduce((sum, group) => sum + group.total_price_cents, 0);

      // Insert daily summary
      await supabase.from('daily_summary').insert({
        date: today,
        total_users: todayJobs.length,
        total_docs: totalDocs,
        total_income_cents: totalIncome
      });

      // Delete storage files and database records
      for (const group of todayJobs) {
        for (const job of group.jobs) {
          await supabase.storage.from('documents').remove([job.storage_path]);
        }
      }

      await supabase.from('job_groups').delete().in('id', todayJobs.map(g => g.id));

      toast({
        title: "EOD Complete",
        description: `Archived ${totalDocs} documents, ₹${(totalIncome / 100).toFixed(2)} revenue`,
      });

      loadJobGroups();
    } catch (error) {
      console.error('EOD error:', error);
      toast({
        title: "Error",
        description: "EOD process failed",
        variant: "destructive",
      });
    }
  };

  const getFilteredJobGroups = () => {
    switch (selectedTab) {
      case "paid":
        return jobGroups.filter(group => group.payment_status === "paid");
      case "processing": 
        return jobGroups.filter(group => group.jobs.some(job => job.status === "processing"));
      case "printed":
        return jobGroups.filter(group => group.jobs.every(job => job.status === "printed"));
      default:
        return jobGroups;
    }
  };

  const stats = {
    totalJobs: jobGroups.reduce((sum, group) => sum + group.jobs.length, 0),
    totalRevenue: jobGroups.reduce((sum, group) => sum + group.total_price_cents, 0),
    pendingJobs: jobGroups.reduce((sum, group) => 
      sum + group.jobs.filter(job => job.status === "queued").length, 0
    ),
    todayJobs: jobGroups.filter(group => 
      new Date(group.created_at).toDateString() === new Date().toDateString()
    ).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{(stats.totalRevenue / 100).toFixed(2)}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingJobs}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayJobs}</div>
            </CardContent>
          </Card>
        </div>

        {/* EOD Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              End of Day Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Archive today's completed jobs and clean up storage
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will permanently delete all job records and files from today
                </p>
              </div>
              <Button onClick={runEOD} variant="destructive" className="gap-2">
                <Trash2 className="w-4 h-4" />
                Run EOD Cleanup
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="all">All Jobs</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="printed">Printed</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            <div className="space-y-4">
              {getFilteredJobGroups().length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No jobs found</h3>
                    <p className="text-muted-foreground">
                      Jobs will appear here when customers place orders
                    </p>
                  </CardContent>
                </Card>
              ) : (
                getFilteredJobGroups().map((group) => (
                  <Card key={group.id} className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Job ID: {group.id.slice(-6).toUpperCase()}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant={group.payment_status === "paid" ? "default" : "secondary"}>
                            {group.payment_status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(group.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total: ₹{(group.total_price_cents / 100).toFixed(2)}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-3">
                        {group.jobs.map((job) => (
                          <div key={job.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{job.file_name}</span>
                                <Badge 
                                  variant={
                                    job.status === "printed" ? "default" :
                                    job.status === "processing" ? "secondary" : "outline"
                                  }
                                >
                                  {job.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {job.color_mode === "bw" ? "B/W" : "Color"} | 
                                {job.sides === "single" ? " Single" : " Double"} side | 
                                {job.pages} pages | 
                                {job.copies} {job.copies === 1 ? "copy" : "copies"}
                              </div>
                              <div className="text-sm font-medium">₹{(job.price_cents / 100).toFixed(2)}</div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => downloadFile(job)}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              
                              {job.status === "queued" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => updateJobStatus(job.id, "processing")}
                                >
                                  Start Processing
                                </Button>
                              )}
                              
                              {job.status === "processing" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => updateJobStatus(job.id, "printed")}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Mark Printed
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}