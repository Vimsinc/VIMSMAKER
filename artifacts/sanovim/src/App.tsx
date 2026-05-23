import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Generator from "@/pages/Generator";
import Images from "@/pages/Images";
import VideoEditor from "@/pages/VideoEditor";
import Trending from "@/pages/Trending";
import HistoryPage from "@/pages/HistoryPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-16 md:ml-56 min-h-screen">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/generator" component={Generator} />
          <Route path="/images" component={Images} />
          <Route path="/video" component={VideoEditor} />
          <Route path="/trending" component={Trending} />
          <Route path="/history" component={HistoryPage} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
