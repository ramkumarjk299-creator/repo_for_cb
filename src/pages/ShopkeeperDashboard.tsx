import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  Printer, 
  FileText, 
  Download, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  Users, 
  Calendar, 
  Trash2, 
  Eye,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

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

interface DailySummary {
  id: string;
  date: string;
  total_users: number;
  total_docs: number;
  total_income_cents: number;
  created_at: string;
}

export default function ShopkeeperDashboard() {
  const [selectedTab, setSelectedTab] = useState("orders");
  const [jobGroups, setJobGroups] = useState<JobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [dateFilter, setDateFilter] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  useEffect(() => {
    loadJobGroups();
    if (selectedTab === "sales") {
      loadDailySummaries();
    }
  }, [selectedTab]);

  const loadJobGroups = async () => {
    try {
      const { data: groups, error: groupsError } = await supabase
        .from('job_groups')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: true }); // Earlier orders first

      if (groupsError) throw groupsError;

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: true }); // Earlier orders first

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

  const loadDailySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_summary')
        .select('*')
        .gte('date', dateFilter.start)
        .lte('date', dateFilter.end)
        .order('date', { ascending: false });

      if (error) throw error;
      setDailySummaries(data || []);
    } catch (error) {
      console.error('Error loading daily summaries:', error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
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

  const deleteJob = async (jobGroupId: string) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;

    try {
      // Find the job group and delete storage files
      const group = jobGroups.find(g => g.id === jobGroupId);
      if (group) {
        for (const job of group.jobs) {
          await supabase.storage.from('documents').remove([job.storage_path]);
        }
      }

      // Delete from database (jobs will be deleted by cascade)
      const { error } = await supabase
        .from('job_groups')
        .delete()
        .eq('id', jobGroupId);

      if (error) throw error;

      setJobGroups(prev => prev.filter(group => group.id !== jobGroupId));
      
      toast({
        title: "Job deleted",
        description: "Job and associated files have been removed",
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job",
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

      // Create download link
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = job.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${job.file_name}`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error", 
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const previewFile = async (job: Job) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(job.storage_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      toast({
        title: "Error",
        description: "Failed to preview file",
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
    return jobGroups; // Show all jobs since users pay first
  };

  const getChartData = () => {
    return dailySummaries.map(summary => ({
      date: new Date(summary.date).toLocaleDateString(),
      earnings: summary.total_income_cents / 100,
      jobs: summary.total_docs
    }));
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

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Orders Management
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Sales / Earnings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Jobs in Queue</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Orders shown in arrival time (earliest first)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredJobGroups().length === 0 ? (
                    <div className="p-8 text-center">
                      <Printer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-semibold mb-2">No jobs in queue</h3>
                      <p className="text-muted-foreground">
                        Jobs will appear here when customers place orders
                      </p>
                    </div>
                  ) : (
                    getFilteredJobGroups().map((group) => (
                      <Card key={group.id} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-lg font-bold text-primary">
                                Job ID: {group.id.slice(-6).toUpperCase()}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">
                                Received: {new Date(group.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Total: ₹{(group.total_price_cents / 100).toFixed(2)}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => deleteJob(group.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          <div className="space-y-3">
                            {group.jobs.map((job) => (
                              <div key={job.id} className="bg-muted p-4 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <FileText className="w-5 h-5 text-primary" />
                                      <span className="font-medium text-lg">{job.file_name}</span>
                                      <Badge 
                                        variant={
                                          job.status === "printed" ? "default" :
                                          job.status === "processing" ? "secondary" : "outline"
                                        }
                                      >
                                        {job.status === "queued" ? "In Queue" : 
                                         job.status === "processing" ? "Processing" : "Printed"}
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="text-muted-foreground">Mode:</span>
                                        <div className="font-medium">
                                          {job.color_mode === "bw" ? "Black & White" : "Color"}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Sides:</span>
                                        <div className="font-medium">
                                          {job.sides === "single" ? "Single Side" : "Double Side"}
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Pages:</span>
                                        <div className="font-medium">{job.pages}</div>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Copies:</span>
                                        <div className="font-medium">{job.copies}</div>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2">
                                      <span className="text-lg font-bold text-primary">
                                        ₹{(job.price_cents / 100).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col gap-2 ml-4">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => previewFile(job)}
                                      className="w-full"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Preview
                                    </Button>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => downloadFile(job)}
                                      className="w-full"
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </Button>
                                    
                                    {job.status === "queued" && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => updateJobStatus(job.id, "processing")}
                                        className="w-full"
                                      >
                                        Start Processing
                                      </Button>
                                    )}
                                    
                                    {job.status === "processing" && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => updateJobStatus(job.id, "printed")}
                                        className="bg-green-600 hover:bg-green-700 w-full"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Mark Printed
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            {/* Date Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Sales Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={dateFilter.start}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                  <Button onClick={loadDailySummaries}>Apply Filter</Button>
                </div>
              </CardContent>
            </Card>

            {/* Summary Table */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Earnings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Number of Jobs</TableHead>
                      <TableHead>Total Earnings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailySummaries.map((summary) => (
                      <TableRow key={summary.id}>
                        <TableCell>{new Date(summary.date).toLocaleDateString()}</TableCell>
                        <TableCell>{summary.total_docs}</TableCell>
                        <TableCell>₹{(summary.total_income_cents / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    earnings: {
                      label: "Earnings",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData()}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="earnings" fill="var(--color-earnings)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}