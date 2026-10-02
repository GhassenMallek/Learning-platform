import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { RequireRole } from './auth/RequireRole';
import { Spinner } from './components/ui/primitives';
import { PublicLayout } from './layouts/PublicLayout';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import CourseDetail from './pages/public/CourseDetail';
import Courses from './pages/public/Courses';
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import NotFound from './pages/NotFound';

// The admin and student apps are separate chunks: visitors never download them.
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));
const StudentApp = lazy(() => import('./pages/student/StudentApp'));

const Loader = () => (
  <div className="flex min-h-dvh items-center justify-center">
    <Spinner />
  </div>
);

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:ref" element={<CourseDetail />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="login" element={<Login portal="student" />} />
        <Route path="admin/login" element={<Login portal="admin" />} />
        <Route path="admin/*" element={<RequireRole role="ADMIN"><AdminApp /></RequireRole>} />
        <Route path="student/*" element={<RequireRole role="STUDENT"><StudentApp /></RequireRole>} />
      </Routes>
    </Suspense>
  );
}
