import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AccountProvider } from "@/context/AccountContext";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "@/pages/Dashboard";
import Content from "@/pages/Content";
import Images from "@/pages/Images";
import Metrics from "@/pages/Metrics";
import Publish from "@/pages/Publish";
import VideoEditor from "@/pages/VideoEditor";
import Market from "@/pages/Market";
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
          <Route path="/content" component={Content} />
          <Route path="/images" component={Images} />
          <Route path="/metrics" component={Metrics} />
          <Route path="/publish" component={Publish} />
          <Route path="/video" component={VideoEditor} />
          <Route path="/market" component={Market} />
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
        <AccountProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppLayout />
          </WouterRouter>
        </AccountProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
