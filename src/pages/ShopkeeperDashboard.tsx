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
  TableRow,
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
  BarChart3,
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
  const [ungroupedJobs, setUngroupedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [dateFilter, setDateFilter] = useState({
    start: new Date().toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  const [printJob, setPrintJob] = useState<Job | null>(null);
  const [shopOnline, setShopOnline] = useState(false);
  const [systemId, setSystemId] = useState<string | null>(null);
  const { toast } = useToast();

  // Load shopkeeper online/offline status
  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from("system_status")
        .select("id, on_off")
        .limit(1)
        .single();
      if (!error && data) {
        setShopOnline(data.on_off === 1);
        setSystemId(data.id);
      }
    };
    fetchStatus();
  }, []);

  // Toggle shopkeeper online/offline
  const handleToggleShop = async () => {
    if (!systemId) return;
    const newStatus = shopOnline ? 0 : 1;
    const { error } = await supabase
      .from("system_status")
      .update({ on_off: newStatus, updated_at: new Date().toISOString() })
      .eq("id", systemId);
    if (!error) setShopOnline(newStatus === 1);
    else
      toast({
        title: "Error",
        description: "Failed to update shop status",
        variant: "destructive",
      });
  };

  useEffect(() => {
    loadJobGroups();
    loadDailySummaries(); // Always load daily summary on page load
  }, []);

  useEffect(() => {
    if (selectedTab === "sales") {
      loadDailySummaries();
    }
  }, [selectedTab]);

  const loadJobGroups = async () => {
    try {
      // Fetch all job groups, set payment_status to 'paid' by default if missing
      const { data: groups, error: groupsError } = await supabase
        .from("job_groups")
        .select("*")
        .order("created_at", { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch all jobs, set payment_status to 'paid' by default if missing
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: true });

      if (jobsError) throw jobsError;

      // Set payment_status to 'paid' by default if missing
      // Group jobs by job_group_id, order by earliest group
      const groupsWithJobs = groups
        .map((group) => ({
          ...group,
          payment_status: group.payment_status || "paid",
          jobs: jobs
            .filter((job) => job.job_group_id === group.id)
            .map((job) => ({
              ...job,
              payment_status: job.payment_status || "paid",
              color_mode: job.color_mode as "bw" | "color",
              sides: job.sides as "single" | "double",
              status: job.status as
                | "queued"
                | "processing"
                | "printed"
                | "ready",
            })),
        }))
        .filter((group) => group.jobs.length > 0)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      setJobGroups(groupsWithJobs);
    } catch (error) {
      console.error("Error loading job groups:", error);
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
        .from("daily_summary")
        .select("*")
        .gte("date", dateFilter.start)
        .lte("date", dateFilter.end)
        .order("date", { ascending: false });

      if (error) throw error;
      setDailySummaries(data || []);
    } catch (error) {
      console.error("Error loading daily summaries:", error);
      toast({
        title: "Error",
        description: "Failed to load sales data",
        variant: "destructive",
      });
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: Job["status"]) => {
    try {
      const { data: updatedJobs, error } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", jobId)
        .select();

      if (error) throw error;

      setJobGroups((prev) =>
        prev.map((group) => ({
          ...group,
          jobs: group.jobs.map((job) =>
            job.id === jobId ? { ...job, status: newStatus } : job
          ),
        }))
      );

      // If job marked as printed, update daily_summary
      if (newStatus === "printed" && updatedJobs && updatedJobs.length > 0) {
        const job = updatedJobs[0];
        const today = new Date().toISOString().split("T")[0];
        // Get existing summary
        const { data: existingSummary, error: summaryError } = await supabase
          .from("daily_summary")
          .select("*")
          .eq("date", today)
          .single();
        if (!summaryError && existingSummary) {
          await supabase
            .from("daily_summary")
            .update({
              total_users: existingSummary.total_users + 1,
              total_docs: existingSummary.total_docs + 1,
              total_income_cents:
                existingSummary.total_income_cents + job.price_cents,
            })
            .eq("date", today);
        } else {
          await supabase.from("daily_summary").insert({
            date: today,
            total_users: 1,
            total_docs: 1,
            total_income_cents: job.price_cents,
          });
        }
      }

      toast({
        title: "Status updated",
        description: `Job marked as ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating job status:", error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const deleteJob = async (jobGroupId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this job? This action cannot be undone."
      )
    )
      return;

    try {
      // Find the job group and delete storage files
      const group = jobGroups.find((g) => g.id === jobGroupId);
      if (group) {
        for (const job of group.jobs) {
          await supabase.storage.from("documents").remove([job.storage_path]);
        }
        // Upsert daily_summary for today: subtract values if exists, insert if not
        const today = new Date().toISOString().split("T")[0];
        const { data: existingSummary, error: summaryError } = await supabase
          .from("daily_summary")
          .select("*")
          .eq("date", today)
          .single();
        if (!summaryError && existingSummary) {
          // Update by subtracting deleted group values
          await supabase
            .from("daily_summary")
            .update({
              total_users: Math.max(existingSummary.total_users + 1, 0),
              total_docs: Math.max(
                existingSummary.total_docs + group.jobs.length,
                0
              ),
              total_income_cents: Math.max(
                existingSummary.total_income_cents + group.total_price_cents,
                0
              ),
            })
            .eq("date", today);
        } else {
          // Insert new summary with deleted group values (negative, but ensures a record exists)
          await supabase.from("daily_summary").insert({
            date: today,
            total_users: 0,
            total_docs: 0,
            total_income_cents: 0,
          });
        }
      }

      // Delete from database (jobs will be deleted by cascade)
      const { error } = await supabase
        .from("job_groups")
        .delete()
        .eq("id", jobGroupId);

      if (error) throw error;

      setJobGroups((prev) => prev.filter((group) => group.id !== jobGroupId));
      // Refresh daily summary in stats
      await loadDailySummaries();
      toast({
        title: "Job deleted",
        description: "Job and associated files have been removed",
      });
    } catch (error) {
      console.error("Error deleting job:", error);
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
        .from("documents")
        .createSignedUrl(job.storage_path, 3600);
      if (error) throw error;
      const params = new URLSearchParams({
        file: data.signedUrl,
        fileName: job.file_name,
        colorMode: job.color_mode,
        sides: job.sides,
        pages: job.pages,
        copies: job.copies?.toString() || "1",
        price: job.price_cents?.toString() || "0",
      });
      window.open(`/print-preview?${params.toString()}`, "_blank");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open print preview",
        variant: "destructive",
      });
    }
  };

  const previewFile = async (job: Job) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .createSignedUrl(job.storage_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Error previewing file:", error);
      toast({
        title: "Error",
        description: "Failed to preview file",
        variant: "destructive",
      });
    }
  };
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  const runEOD = async () => {
    if (
      !confirm("This will archive today's jobs and delete all data. Continue?")
    )
      return;

    try {
      const today = new Date().toISOString().split("T")[0];

      // Calculate daily summary
      const todayJobs = jobGroups.filter((group) =>
        group.created_at.startsWith(today)
      );

      const totalDocs = todayJobs.reduce(
        (sum, group) => sum + group.jobs.length,
        0
      );
      const totalIncome = todayJobs.reduce(
        (sum, group) => sum + group.total_price_cents,
        0
      );

      // Upsert daily summary: add to existing if present, else insert new
      const { data: existingSummary, error: summaryError } = await supabase
        .from("daily_summary")
        .select("*")
        .eq("date", today)
        .single();

      if (!summaryError && existingSummary) {
        // Update by adding all jobGroups values
        await supabase
          .from("daily_summary")
          .update({
            total_users: existingSummary.total_users + todayJobs.length,
            total_docs: existingSummary.total_docs + totalDocs,
            total_income_cents:
              existingSummary.total_income_cents + totalIncome,
          })
          .eq("date", today);
      } else {
        // Insert new summary with all jobGroups values
        await supabase.from("daily_summary").insert({
          date: today,
          total_users: todayJobs.length,
          total_docs: totalDocs,
          total_income_cents: totalIncome,
        });
      }

      // Delete storage files and database records
      for (const group of todayJobs) {
        for (const job of group.jobs) {
          await supabase.storage.from("documents").remove([job.storage_path]);
        }
      }

      await supabase
        .from("job_groups")
        .delete()
        .in(
          "id",
          todayJobs.map((g) => g.id)
        );

      toast({
        title: "EOD Complete",
        description: `Archived ${totalDocs} documents, ₹${(
          totalIncome / 100
        ).toFixed(2)} revenue`,
      });

      loadJobGroups();
      // Refresh daily summary in stats
      await loadDailySummaries();
    } catch (error) {
      console.error("EOD error:", error);
      toast({
        title: "Error",
        description: "EOD process failed",
        variant: "destructive",
      });
    }
  };
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  const getFilteredJobGroups = () => {
    return jobGroups; // Show all jobs since users pay first
  };

  const getChartData = () => {
    return dailySummaries.map((summary) => ({
      date: new Date(summary.date).toLocaleDateString(),
      earnings: summary.total_income_cents / 100,
      jobs: summary.total_docs,
    }));
  };

  // Get today's earnings from daily_summary
  const today = new Date().toISOString().split("T")[0];
  const todaySummary = dailySummaries.find((s) => s.date === today);
  const stats = {
    totalJobs: jobGroups.reduce((sum, group) => sum + group.jobs.length, 0),
    totalRevenue: todaySummary ? todaySummary.total_income_cents : 0,
    pendingJobs: jobGroups.reduce(
      (sum, group) =>
        sum + group.jobs.filter((job) => job.status === "queued").length,
      0
    ),
    todayJobs: jobGroups.filter(
      (group) =>
        new Date(group.created_at).toDateString() === new Date().toDateString()
    ).length,
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
          <p className="text-muted-foreground">Shopkeeper control panel</p>
          <div className="flex justify-center items-center gap-4 mt-4">
            <span
              className={
                shopOnline
                  ? "text-green-600 font-bold"
                  : "text-red-600 font-bold"
              }
            >
              {shopOnline ? "Shop is LIVE" : "Shop is OFFLINE"}
            </span>
            <Button
              onClick={handleToggleShop}
              variant={shopOnline ? "destructive" : "default"}
            >
              {shopOnline ? "Go Offline" : "Go Live"}
            </Button>
          </div>
        </div>

        {/* Stats (with Daily Summary) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                  {todaySummary ? todaySummary.total_users : 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                  ₹{todaySummary ? (todaySummary.total_income_cents / 100).toFixed(2) : "0.00"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Jobs
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingJobs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today's Orders
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                  {todaySummary ? todaySummary.total_docs : 0}
              </div>
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
                  This will permanently delete all job records and files from
                  today
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
                    <>
                      {getFilteredJobGroups().map((group) => (
                        <Card
                          key={group.id}
                          className="border-l-4 border-l-primary"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg font-bold text-primary">
                                  Order ID: {group.id.slice(-6).toUpperCase()}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Received:{" "}
                                  {new Date(group.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800 border-green-200">
                                  Total: ₹
                                  {(group.total_price_cents / 100).toFixed(2)}
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
                                <div
                                  key={job.id}
                                  className="bg-muted p-4 rounded-lg"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <FileText className="w-5 h-5 text-primary" />
                                        <span className="font-medium text-lg">
                                          {job.file_name}
                                        </span>
                                        <Badge
                                          variant={
                                            job.status === "printed"
                                              ? "default"
                                              : job.status === "processing"
                                              ? "secondary"
                                              : "outline"
                                          }
                                        >
                                          {job.status === "queued"
                                            ? "In Queue"
                                            : job.status === "processing"
                                            ? "Processing"
                                            : "Printed"}
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">
                                            Mode:
                                          </span>
                                          <div className="font-medium">
                                            {job.color_mode === "bw"
                                              ? "Black & White"
                                              : "Color"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Sides:
                                          </span>
                                          <div className="font-medium">
                                            {job.sides === "single"
                                              ? "Single Side"
                                              : "Double Side"}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Pages:
                                          </span>
                                          <div className="font-medium">
                                            {job.pages}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">
                                            Copies:
                                          </span>
                                          <div className="font-medium">
                                            {job.copies}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <span className="text-lg font-bold text-primary">
                                          ₹{(job.price_cents / 100).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-2 ml-4">
                                      {/* Print Modal */}
                                      {printJob && (
                                        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                                          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
                                            <h2 className="text-xl font-bold mb-4">
                                              Print Document
                                            </h2>
                                            <div className="mb-2">
                                              <b>File:</b> {printJob.file_name}
                                            </div>
                                            <div className="mb-2">
                                              <b>Mode:</b>{" "}
                                              {printJob.color_mode === "bw"
                                                ? "Black & White"
                                                : "Color"}
                                            </div>
                                            <div className="mb-2">
                                              <b>Sides:</b>{" "}
                                              {printJob.sides === "single"
                                                ? "Single Side"
                                                : "Double Side"}
                                            </div>
                                            <div className="mb-2">
                                              <b>Pages:</b> {printJob.pages}
                                            </div>
                                            <div className="mb-2">
                                              <b>Copies:</b> {printJob.copies}
                                            </div>
                                            <div className="mb-2">
                                              <b>Price:</b> ₹
                                              {(
                                                printJob.price_cents / 100
                                              ).toFixed(2)}
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                              <Button
                                                variant="default"
                                                onClick={() => {
                                                  window.open(
                                                    `/api/print?file=${encodeURIComponent(
                                                      printJob.storage_path
                                                    )}`
                                                  );
                                                  setPrintJob(null);
                                                }}
                                              >
                                                Print Now
                                              </Button>
                                              <Button
                                                variant="outline"
                                                onClick={() =>
                                                  setPrintJob(null)
                                                }
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
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
                                          onClick={() =>
                                            updateJobStatus(
                                              job.id,
                                              "processing"
                                            )
                                          }
                                          className="w-full"
                                        >
                                          Start Processing
                                        </Button>
                                      )}
                                      {job.status === "processing" && (
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            updateJobStatus(job.id, "printed")
                                          }
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
                      ))}
                    </>
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
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          ...prev,
                          start: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateFilter.end}
                      onChange={(e) =>
                        setDateFilter((prev) => ({
                          ...prev,
                          end: e.target.value,
                        }))
                      }
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
                        <TableCell>
                          {new Date(summary.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{summary.total_docs}</TableCell>
                        <TableCell>
                          ₹{(summary.total_income_cents / 100).toFixed(2)}
                        </TableCell>
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
