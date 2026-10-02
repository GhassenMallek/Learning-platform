import { Route, Routes } from 'react-router-dom';
import NotFound from '../NotFound';
import CourseOutline from './CourseOutline';
import Courses from './Courses';
import Dashboard from './Dashboard';
import Lesson from './Lesson';
import Profile from './Profile';
import { StudentLayout } from './StudentLayout';

/** Everything under /student. */
export default function StudentApp() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseOutline />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<Lesson />} />
        <Route path="profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
