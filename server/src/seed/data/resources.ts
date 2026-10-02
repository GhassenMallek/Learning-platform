import { l, type L } from './helpers';

/** Official documentation links attached to a few lessons (key: `courseSlug|English lesson title`). */
export const RESOURCES: Record<string, { title: L; url: string }[]> = {
  'flutter-development|What is Flutter?': [
    { title: l('Flutter documentation', 'Documentation Flutter'), url: 'https://docs.flutter.dev/' },
    { title: l('Dart language documentation', 'Documentation du langage Dart'), url: 'https://dart.dev/language' },
  ],
  'flutter-development|Provider': [{ title: l('provider on pub.dev', 'provider sur pub.dev'), url: 'https://pub.dev/packages/provider' }],
  'flutter-development|Riverpod': [{ title: l('Riverpod documentation', 'Documentation Riverpod'), url: 'https://riverpod.dev/' }],
  'flutter-development|BLoC / Cubit': [{ title: l('BLoC library', 'Bibliothèque BLoC'), url: 'https://bloclibrary.dev/' }],
  'flutter-development|Hive': [{ title: l('hive on pub.dev', 'hive sur pub.dev'), url: 'https://pub.dev/packages/hive' }],
  'java-oop|Variables': [{ title: l('The Java Tutorials — Variables', 'Tutoriels Java — Variables'), url: 'https://docs.oracle.com/javase/tutorial/java/nutsandbolts/variables.html' }],
  'java-oop|Choosing the right collection': [{ title: l('The Java Tutorials — Collections', 'Tutoriels Java — Collections'), url: 'https://docs.oracle.com/javase/tutorial/collections/' }],
  'financial-audit|Auditing standards (ISA)': [{ title: l('IAASB — International Standards on Auditing', 'IAASB — Normes internationales d’audit'), url: 'https://www.iaasb.org/' }],
  'ifrs|What IFRS are and who uses them': [{ title: l('IFRS Foundation', 'Fondation IFRS'), url: 'https://www.ifrs.org/' }],
};
