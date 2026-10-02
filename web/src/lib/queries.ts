import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AcademicYear, Category, CourseListItem, PublicStats, SiteSettings } from './types';

/** Public, cache-friendly reference data shared by many screens. */
export const useSiteSettings = () =>
  useQuery({ queryKey: ['settings', 'public'], queryFn: () => api.get<SiteSettings>('/settings/public'), staleTime: 10 * 60_000 });

export const usePublicStats = () =>
  useQuery({ queryKey: ['stats', 'public'], queryFn: () => api.get<PublicStats>('/stats/public'), staleTime: 5 * 60_000 });

export const usePublishedCourses = () =>
  useQuery({
    queryKey: ['courses', 'published'],
    queryFn: async () => (await api.list<CourseListItem>('/courses', { status: 'PUBLISHED', pageSize: 100 })).items,
    staleTime: 60_000,
  });

export const useCategories = (opts: { withCourses?: boolean } = {}) =>
  useQuery({
    queryKey: ['categories', opts.withCourses ?? false],
    queryFn: () => api.get<Category[]>('/categories', opts.withCourses ? { withCourses: true } : undefined),
    staleTime: 60_000,
  });

export const useAcademicYears = () =>
  useQuery({ queryKey: ['academic-years'], queryFn: () => api.get<AcademicYear[]>('/academic-years'), staleTime: 60_000 });
