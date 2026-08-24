import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import ProtectedRoute from "./router/ProtectedRoute";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectsPage from "./pages/ProjectsPage";
import RepositoryPage from "./pages/RepositoryPage";
import RepositoryDetailsPage from "./pages/RepositoryDetailsPage";
import ChatPage from "./pages/ChatPage";
import AnalysisPage from "./pages/AnalysisPage";
import TestingPage from "./pages/TestingPage";
import ReportsPage from "./pages/ReportsPage";
import MemoryPage from "./pages/MemoryPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
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

        {/* 404 */}

        <Route
          path="*"
          element={
            <NotFoundPage />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;