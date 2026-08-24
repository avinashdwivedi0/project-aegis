import {
  Route,
  Routes,
} from "react-router-dom";

import DashboardLayout from "@/layouts/DashboardLayout";
import MainLayout from "@/layouts/MainLayout";

import AnalysisPage from "@/pages/AnalysisPage";
import ChatPage from "@/pages/ChatPage";
import DashboardPage from "@/pages/DashboardPage";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import MemoryPage from "@/pages/MemoryPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ProjectsPage from "@/pages/ProjectsPage";
import RegisterPage from "@/pages/RegisterPage";
import ReportsPage from "@/pages/ReportsPage";
import RepositoryDetailsPage from "@/pages/RepositoryDetailsPage";
import RepositoryPage from "@/pages/RepositoryPage";
import SettingsPage from "@/pages/SettingsPage";
import TestingPage from "@/pages/TestingPage";

import ProtectedRoute from "./ProtectedRoute";

function AppRouter() {
  return (
    <Routes>
      {/* Public */}

      <Route
        element={<MainLayout />}
      >
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<RegisterPage />}
        />
      </Route>

      {/* Protected */}

      <Route
        element={
          <ProtectedRoute />
        }
      >
        <Route
          element={
            <DashboardLayout />
          }
        >
          <Route
            path="/dashboard"
            element={
              <DashboardPage />
            }
          />

          <Route
            path="/projects"
            element={
              <ProjectsPage />
            }
          />

          <Route
            path="/projects/:projectId/repositories"
            element={
              <RepositoryPage />
            }
          />

          <Route
            path="/projects/:projectId/repositories/:repositoryId"
            element={
              <RepositoryDetailsPage />
            }
          />

          <Route
            path="/projects/:projectId/repositories/:repositoryId/chat"
            element={
              <ChatPage />
            }
          />

          <Route
            path="/analysis"
            element={
              <AnalysisPage />
            }
          />

          <Route
            path="/testing"
            element={
              <TestingPage />
            }
          />

          <Route
            path="/reports"
            element={
              <ReportsPage />
            }
          />

          <Route
            path="/memory"
            element={
              <MemoryPage />
            }
          />

          <Route
            path="/settings"
            element={
              <SettingsPage />
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <NotFoundPage />
        }
      />
    </Routes>
  );
}

export default AppRouter;