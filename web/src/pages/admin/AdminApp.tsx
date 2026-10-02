import { Route, Routes } from 'react-router-dom';
import NotFound from '../NotFound';
import { AdminLayout } from './AdminLayout';
import Categories from './Categories';
import CourseView from './CourseView';
import CourseWizard from './CourseWizard';
import Courses from './Courses';
import Dashboard from './Dashboard';
import Enrollments from './Enrollments';
import Messages from './Messages';
import Settings from './Settings';
import StudentDetail from './StudentDetail';
import NewStudentPage from './StudentForm';
import Students from './Students';

/** Everything under /admin. Route protection lives in <RequireRole>, and again — for real — on every API call. */
export default function AdminApp() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/new" element={<CourseWizard />} />
        <Route path="courses/:id" element={<CourseView />} />
        <Route path="courses/:id/edit" element={<CourseWizard />} />
        <Route path="categories" element={<Categories />} />
        <Route path="students" element={<Students />} />
        <Route path="students/new" element={<NewStudentPage />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="enrollments" element={<Enrollments />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
