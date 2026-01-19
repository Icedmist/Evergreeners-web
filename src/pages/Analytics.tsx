import { Header } from "@/components/Header";
import { FloatingNav } from "@/components/FloatingNav";
import { Section } from "@/components/Section";
import { ActivityGrid } from "@/components/ActivityGrid";
import { InsightCard } from "@/components/InsightCard";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Calendar, GitCommit, GitPullRequest, Clock } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { toast } from "sonner";

// Mockup data (used when GitHub data not available)
const mockMonthlyData = [
  { month: "Jan", commits: 87 },
  { month: "Feb", commits: 125 },
  { month: "Mar", commits: 98 },
  { month: "Apr", commits: 156 },
  { month: "May", commits: 178 },
  { month: "Jun", commits: 145 },
];

const mockWeeklyCommits = [
  { day: "Mon", commits: 12 },
  { day: "Tue", commits: 18 },
  { day: "Wed", commits: 8 },
  { day: "Thu", commits: 22 },
  { day: "Fri", commits: 15 },
  { day: "Sat", commits: 5 },
  { day: "Sun", commits: 9 },
];

const mockHourlyActivity = [
  { hour: "6am", activity: 5 },
  { hour: "9am", activity: 45 },
  { hour: "12pm", activity: 30 },
  { hour: "3pm", activity: 55 },
  { hour: "6pm", activity: 40 },
  { hour: "9pm", activity: 25 },
  { hour: "12am", activity: 10 },
];

const mockLanguageData = [
  { name: "TypeScript", value: 45, color: "hsl(142, 71%, 45%)" },
  { name: "JavaScript", value: 25, color: "hsl(142, 71%, 35%)" },
  { name: "Python", value: 15, color: "hsl(142, 71%, 55%)" },
  { name: "Other", value: 15, color: "hsl(142, 71%, 25%)" },
];

const mockActivityData = Array.from({ length: 365 }, () =>
  Math.random() > 0.25 ? Math.floor(Math.random() * 5) : 0
);

/**
 * Generate weekly data from contribution calendar
 */
function generateWeeklyDataFromContributions(contributionData: any[]): any[] {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyStats: Record<string, number> = {
    Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0
  };

  contributionData.forEach((day: any) => {
    if (day.date && day.contributionCount !== undefined) {
      const date = new Date(day.date);
      const dayName = weekDays[date.getDay()];
      weeklyStats[dayName] += day.contributionCount;
    }
  });

  return weekDays.map(day => ({
    day,
    commits: weeklyStats[day] || 0
  }));
}

/**
 * Generate monthly data from contribution calendar (last 6 months)
 */
function generateMonthlyDataFromContributions(contributionData: any[]): any[] {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyStats: Record<string, number> = {};

  contributionData.forEach((day: any) => {
    if (day.date && day.contributionCount !== undefined) {
      const date = new Date(day.date);
      const monthKey = monthNames[date.getMonth()];
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + day.contributionCount;
    }
  });

  // Get last 6 months
  const now = new Date();
  const lastSixMonths = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = monthNames[date.getMonth()];
    lastSixMonths.push({
      month: monthName,
      commits: monthlyStats[monthName] || 0
    });
  }

  return lastSixMonths;
}

type TimeRange = "week" | "month" | "year";

export default function Analytics() {
  const { data: session } = useSession();
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [isLoading, setIsLoading] = useState(true);
  const [githubData, setGithubData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState(mockWeeklyCommits);
  const [monthlyData, setMonthlyData] = useState(mockMonthlyData);

  // Load GitHub data
  useEffect(() => {
    const loadGithubData = async () => {
      try {
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const apiUrl = baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`;

        const res = await fetch(`${apiUrl}/api/user/profile`, {
          credentials: 'include'
        });

        if (res.ok) {
          const { user } = await res.json();
          setGithubData(user);

          // Generate charts from contribution data
          if (user.githubContributionData && user.githubContributionData.length > 0) {
            setWeeklyData(generateWeeklyDataFromContributions(user.githubContributionData));
            setMonthlyData(generateMonthlyDataFromContributions(user.githubContributionData));
          } else if (user.contributionData && user.contributionData.length > 0) {
            setWeeklyData(generateWeeklyDataFromContributions(user.contributionData));
            setMonthlyData(generateMonthlyDataFromContributions(user.contributionData));
          }
        }
      } catch (error) {
        console.error("Failed to load GitHub data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGithubData();
  }, [session]);

  const totalCommits = githubData?.githubTotalCommits || githubData?.totalCommits || 2847;
  const todayCommits = githubData?.githubTodayCommits || githubData?.todayCommits || 0;
  const streak = githubData?.githubStreak || githubData?.streak || 24;

  const stats = [
    { label: "Total Commits", value: totalCommits.toLocaleString(), change: "+12%", trend: "up", icon: GitCommit },
    { label: "Pull Requests", value: "156", change: "+8%", trend: "up", icon: GitPullRequest },
    { label: "Active Days", value: "284", change: "-3%", trend: "down", icon: Calendar },
    { label: "Current Streak", value: streak.toString(), change: "+5%", trend: "up", icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-background custom-scrollbar">
      <Header />

      <main className="container pt-24 pb-32 md:pb-12 space-y-8">
        {/* Page Header */}
        <section className="animate-fade-in">
          <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your coding patterns</p>
        </section>

        {/* Time Range Selector */}
        <div className="flex gap-2 animate-fade-up" style={{ animationDelay: "0.05s" }}>
          {(["week", "month", "year"] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300",
                timeRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <Section className="animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all duration-300 group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className={cn(
                    "text-xs flex items-center gap-1",
                    stat.trend === "up" ? "text-primary" : "text-destructive"
                  )}>
                    {stat.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Monthly Trend */}
        <Section title="Monthly Trend" className="animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorCommits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={2}
                  fill="url(#colorCommits)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Weekly Distribution */}
        <Section title="Weekly Distribution" className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 12 }}
                />
                <Bar
                  dataKey="commits"
                  fill="hsl(142, 71%, 45%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Two Column Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hourly Pattern */}
          <Section title="Peak Hours" className="animate-fade-up" style={{ animationDelay: "0.25s" }}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockHourlyActivity}>
                  <XAxis
                    dataKey="hour"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(0, 0%, 55%)', fontSize: 10 }}
                  />\n                  <Line
                    type="monotone"
                    dataKey="activity"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 71%, 45%)', strokeWidth: 0, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Languages */}
          <Section title="Languages" className="animate-fade-up" style={{ animationDelay: "0.3s" }}>
            <div className="h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockLanguageData}
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {mockLanguageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {mockLanguageData.map((lang) => (
                <div key={lang.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                  <span className="text-muted-foreground">{lang.name}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Contribution Heatmap */}
        <Section title="Year in Code" className="animate-fade-up" style={{ animationDelay: "0.35s" }}>
          <ActivityGrid data={mockActivityData} />
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`w-3 h-3 rounded-sm ${level === 0 ? "bg-secondary" :
                      level === 1 ? "bg-primary/25" :
                        level === 2 ? "bg-primary/50" :
                          level === 3 ? "bg-primary/75" :
                            "bg-primary"
                    }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </Section>

        {/* Insights */}
        <Section title="AI Insights" className="animate-fade-up space-y-3" style={{ animationDelay: "0.4s" }}>
          <InsightCard text="Your most productive day is Thursday. Consider scheduling complex tasks then." />
          <InsightCard text="You commit most frequently at 3 PM. Your afternoon focus sessions are working!" />
          <InsightCard text="TypeScript usage increased 15% this month. Great progress on type safety!" />
        </Section>
      </main>

      <FloatingNav />
    </div>
  );
}
