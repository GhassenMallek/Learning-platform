import mongoose, { type Model } from 'mongoose';
import { env } from '../config/env';
import { Admin, Student, User } from './models/identity';
import { AcademicYear, Category, Course, CourseModule, Lesson } from './models/catalog';
import { ContactMessage, Enrollment, LessonProgress, Setting } from './models/learning';

export * from './enums';
export * from './models/identity';
export * from './models/catalog';
export * from './models/learning';

export const allModels: Model<any>[] = [User, Admin, Student, Category, AcademicYear, Course, CourseModule, Lesson, Enrollment, LessonProgress, ContactMessage, Setting];

mongoose.set('strictQuery', true);

export function databaseName(uri = env.databaseUri): string {
  const path = uri.replace(/^mongodb(\+srv)?:\/\/[^/]+\/?/, '').split('?')[0];
  return path || 'test';
}

export async function connectDb(uri = env.databaseUri) {
  // Safety net: the test suite wipes its database, so it may only ever touch one named "*_test".
  if (env.isTest && !databaseName(uri).endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${databaseName(uri)}": the test database name must end with "_test".`);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  // Build/verify every index (unique constraints are part of the integrity model) before serving traffic.
  await Promise.all(allModels.map((m) => m.init()));
  return mongoose.connection;
}

export const disconnectDb = () => mongoose.disconnect();

/** Test/seed helper: delete every document but keep collections + indexes. */
export async function clearDatabase() {
  await Promise.all(allModels.map((m) => m.deleteMany({})));
}
