import { l, mod, pairs, type SeedCourse } from './helpers';

/** The six initial accounting subjects — nothing else. Grouping by academic year happens dynamically in the app. */

export const intermediateAccounting: SeedCourse = {
  slug: 'intermediate-accounting-1',
  category: 'accounting',
  year: '2nd-year',
  title: l('Intermediate Accounting I', 'Comptabilité Intermédiaire I'),
  short: l(
    'Go beyond the basics: fixed assets, inventories, receivables, provisions and year-end adjustments.',
    "Allez au-delà des bases : immobilisations, stocks, créances, provisions et écritures d'inventaire.",
  ),
  description: l(
    'Intermediate Accounting I consolidates the double-entry foundations and applies them to the accounts that matter most in practice: non-current assets and depreciation, inventories, receivables and payables, provisions and year-end adjustments.\n\nEvery topic is taught with worked examples and journal entries, so you learn not only the rules but how to apply them to real transactions.',
    "Comptabilité Intermédiaire I consolide les bases de la partie double et les applique aux comptes les plus importants en pratique : immobilisations et amortissements, stocks, créances et dettes, provisions et écritures d'inventaire.\n\nChaque notion est enseignée avec des exemples chiffrés et des écritures comptables : vous apprenez les règles, mais aussi à les appliquer à de vraies opérations.",
  ),
  level: 'INTERMEDIATE',
  duration: { value: 12, unit: 'WEEKS' },
  objectives: pairs([
    ['Record transactions accurately through the full accounting cycle', "Enregistrer correctement les opérations sur l'ensemble du cycle comptable"],
    ['Account for fixed assets and calculate depreciation', 'Comptabiliser les immobilisations et calculer les amortissements'],
    ['Value inventories and compare cost-flow methods', 'Évaluer les stocks et comparer les méthodes de valorisation'],
    ['Measure receivables, payables and provisions', 'Évaluer les créances, les dettes et les provisions'],
    ['Prepare year-end adjusting entries', "Passer les écritures d'inventaire de fin d'exercice"],
  ]),
  audience: pairs([
    ['Second-year accounting and finance students', 'Étudiants de deuxième année en comptabilité et finance'],
    ['Junior accountants who want to strengthen their fundamentals', 'Comptables juniors qui souhaitent consolider leurs fondamentaux'],
    ['Learners preparing for professional accounting exams', "Candidats préparant les examens professionnels de comptabilité"],
  ]),
  skills: pairs([
    ['Double-entry bookkeeping', 'Comptabilité en partie double'],
    ['Depreciation', 'Amortissements'],
    ['Inventory valuation', 'Évaluation des stocks'],
    ['Provisions', 'Provisions'],
    ['Year-end adjustments', "Écritures d'inventaire"],
    ['Trial balance', 'Balance des comptes'],
  ]),
  faq: [
    { q: l('Is this course suitable if I have never studied accounting?', "Ce cours convient-il si je n'ai jamais étudié la comptabilité ?"), a: l('It assumes you know the basics of double-entry bookkeeping. Module 1 reviews the essentials before moving on.', 'Il suppose que vous connaissez les bases de la partie double. Le module 1 rappelle l’essentiel avant d’avancer.') },
    { q: l('Does the course include exercises?', 'Le cours comprend-il des exercices ?'), a: l('Yes. Every lesson uses worked examples and each module ends with practice cases.', 'Oui. Chaque leçon s’appuie sur des exemples chiffrés et chaque module se termine par des cas pratiques.') },
  ],
  project: {
    title: l('Year-end closing case', "Cas de clôture d'exercice"),
    description: l(
      'Complete a full year-end closing for a small trading company: adjusting entries, depreciation schedule, inventory valuation and a corrected trial balance.',
      "Réalisez la clôture complète d'un exercice pour une petite entreprise commerciale : écritures d'inventaire, tableau d'amortissements, évaluation des stocks et balance corrigée.",
    ),
  },
  modules: [
    mod('The Accounting Cycle', 'Le cycle comptable', 'From the conceptual framework to the trial balance.', 'Du cadre conceptuel à la balance des comptes.', [
      ['Conceptual framework and principles', 'Cadre conceptuel et principes comptables', 'Accrual basis, going concern, prudence and useful information.', "Comptabilité d'engagement, continuité d'exploitation, prudence et qualités de l'information.", 15],
      ['Double-entry and the journal', 'Partie double et journal', 'Debits, credits and recording transactions.', 'Débits, crédits et enregistrement des opérations.', 15],
      ['Ledger and trial balance', 'Grand livre et balance', 'Post to accounts and prove the books balance.', 'Reportez les écritures en comptes et vérifiez l’équilibre des livres.', 12],
      ['Year-end adjusting entries', "Écritures d'inventaire de fin d'exercice", 'Accruals, deferrals and prepaid items.', "Charges à payer, produits à recevoir et charges constatées d'avance.", 18],
    ]),
    mod('Non-current Assets', 'Immobilisations', 'Recognise, depreciate, impair and dispose of long-term assets.', 'Comptabilisez, amortissez, dépréciez et cédez les actifs durables.', [
      ['Acquisition cost', "Coût d'acquisition", 'What is included in the cost of an asset.', "Ce qui entre dans le coût d'un actif.", 12],
      ['Depreciation methods', "Méthodes d'amortissement", 'Straight-line, declining balance and units of production.', 'Linéaire, dégressif et unités de production.', 18],
      ['Disposals and impairment', 'Cessions et dépréciations', 'Gains, losses and write-downs of assets.', 'Plus-values, moins-values et dépréciation des actifs.', 14],
      ['Intangible assets', 'Immobilisations incorporelles', 'Recognition and amortisation of intangible assets.', 'Comptabilisation et amortissement des actifs incorporels.', 12],
    ]),
    mod('Inventories', 'Stocks', 'Value what is on the shelf and what has been sold.', 'Évaluez ce qui est en rayon et ce qui a été vendu.', [
      ['Recognition and measurement', 'Comptabilisation et évaluation', 'Cost, net realisable value and what counts as inventory.', 'Coût, valeur nette de réalisation et périmètre des stocks.', 12],
      ['FIFO vs weighted average cost', 'PEPS et coût moyen pondéré', 'How cost-flow assumptions change profit and inventory.', 'Comment les méthodes de valorisation modifient le résultat et les stocks.', 16],
      ['Perpetual and periodic systems', 'Inventaire permanent et intermittent', 'Two ways of tracking inventory in the books.', 'Deux façons de suivre les stocks en comptabilité.', 12],
      ['Inventory write-downs', 'Dépréciation des stocks', 'When inventory is worth less than its cost.', 'Quand les stocks valent moins que leur coût.', 10],
    ]),
    mod('Receivables, Payables and Provisions', 'Créances, dettes et provisions', 'Measure what is owed to and by the company.', 'Évaluez ce que l’entreprise doit et ce qui lui est dû.', [
      ['Trade receivables and doubtful debts', 'Créances clients et créances douteuses', 'Recognise customer balances and impairment.', 'Comptabilisez les créances clients et leur dépréciation.', 14],
      ['Trade payables and accruals', 'Dettes fournisseurs et charges à payer', 'Suppliers, accrued expenses and cut-off.', 'Fournisseurs, charges à payer et séparation des exercices.', 12],
      ['Provisions and contingencies', 'Provisions et passifs éventuels', 'When to recognise a provision and when only to disclose.', 'Quand constater une provision et quand se limiter à une information.', 14],
      ['Bank reconciliation', 'Rapprochement bancaire', 'Reconcile the ledger with the bank statement.', 'Rapprochez la comptabilité et le relevé bancaire.', 12],
    ]),
    mod('Equity and Financing', 'Capitaux propres et financement', 'Capital, reserves, profit distribution and loans.', 'Capital, réserves, distribution du résultat et emprunts.', [
      ['Share capital and reserves', 'Capital social et réserves', 'Contributions, legal and other reserves.', 'Apports, réserves légales et autres réserves.', 12],
      ['Profit appropriation', 'Affectation du résultat', 'Dividends, reserves and retained earnings.', 'Dividendes, réserves et report à nouveau.', 12],
      ['Loans and interest', 'Emprunts et intérêts', 'Loan schedules and accrued interest.', "Tableaux d'emprunt et intérêts courus.", 14],
    ]),
  ],
};

export const financialStatements: SeedCourse = {
  slug: 'financial-statements-preparation',
  category: 'accounting',
  year: '2nd-year',
  title: l('Preparation of Financial Statements', 'Élaboration des États Financiers'),
  short: l(
    'Turn a trial balance into a complete, well-presented set of financial statements.',
    "Transformez une balance en un jeu complet d'états financiers, correctement présentés.",
  ),
  description: l(
    'This course shows how a company’s books become the financial statements that lenders, investors and managers rely on: the balance sheet, the income statement, the cash flow statement and the notes.\n\nYou practise on complete cases, from the adjusted trial balance to a final set of statements, and finish by reading them with basic ratio analysis.',
    "Ce cours montre comment la comptabilité d'une entreprise devient les états financiers sur lesquels s'appuient banquiers, investisseurs et dirigeants : bilan, compte de résultat, tableau de flux de trésorerie et annexe.\n\nVous vous entraînez sur des cas complets, de la balance après inventaire jusqu'à des états finaux, puis vous les interprétez grâce à l'analyse par ratios.",
  ),
  level: 'INTERMEDIATE',
  duration: { value: 10, unit: 'WEEKS' },
  objectives: pairs([
    ['Build a balance sheet with correct classification and measurement', 'Établir un bilan avec un classement et une évaluation corrects'],
    ['Prepare an income statement by nature or by function', 'Établir un compte de résultat par nature ou par fonction'],
    ['Produce a cash flow statement with the indirect method', 'Élaborer un tableau de flux de trésorerie par la méthode indirecte'],
    ['Draft the essential notes to the financial statements', "Rédiger l'essentiel de l'annexe aux états financiers"],
    ['Read the statements with liquidity, solvency and profitability ratios', 'Interpréter les états avec des ratios de liquidité, de solvabilité et de rentabilité'],
  ]),
  audience: pairs([
    ['Second-year accounting students', 'Étudiants de deuxième année en comptabilité'],
    ['Bookkeepers moving toward reporting roles', 'Comptables qui évoluent vers des fonctions de reporting'],
    ['Small-business owners who want to understand their statements', 'Dirigeants de petites entreprises qui veulent comprendre leurs états financiers'],
  ]),
  skills: pairs([
    ['Financial reporting', 'Reporting financier'],
    ['Balance sheet', 'Bilan'],
    ['Income statement', 'Compte de résultat'],
    ['Cash flow', 'Flux de trésorerie'],
    ['Ratio analysis', 'Analyse par ratios'],
  ]),
  faq: [
    { q: l('Which accounting framework is used?', 'Quel référentiel comptable est utilisé ?'), a: l('The concepts are common to all major frameworks; presentation examples highlight where local rules and IFRS differ.', 'Les notions sont communes à tous les grands référentiels ; les exemples de présentation soulignent les différences entre règles locales et IFRS.') },
    { q: l('Do I need spreadsheet skills?', 'Faut-il savoir utiliser un tableur ?'), a: l('Basic spreadsheet skills help with the exercises but are not required.', "Des notions de tableur aident pour les exercices mais ne sont pas indispensables.") },
  ],
  project: {
    title: l('Complete set of statements', "Jeu complet d'états financiers"),
    description: l(
      'From a case company’s adjusted trial balance, prepare the balance sheet, income statement, cash flow statement and key notes — then analyse them with ratios.',
      "À partir de la balance après inventaire d'une entreprise fictive, établissez le bilan, le compte de résultat, le tableau de flux et l'essentiel de l'annexe — puis analysez-les avec des ratios.",
    ),
  },
  modules: [
    mod('From Trial Balance to Statements', 'De la balance aux états financiers', 'Prepare the numbers before presenting them.', 'Préparez les chiffres avant de les présenter.', [
      ['Adjusted trial balance', 'Balance après inventaire', 'Check that every adjustment is booked.', 'Vérifiez que chaque écriture d’inventaire est passée.', 12],
      ['The closing process', 'Le processus de clôture', 'Close temporary accounts and determine the result.', 'Soldez les comptes de gestion et déterminez le résultat.', 12],
      ['Working papers', 'Les documents de travail', 'Organise a worksheet that supports the statements.', 'Organisez un document de travail qui justifie les états.', 10],
    ]),
    mod('The Balance Sheet', 'Le bilan', 'What the company owns, owes and has invested.', 'Ce que l’entreprise possède, doit et a investi.', [
      ['Structure and classification', 'Structure et classement', 'Current and non-current assets and liabilities.', 'Actifs et passifs courants et non courants.', 14],
      ['Measuring assets and liabilities', 'Évaluation des actifs et passifs', 'Cost, fair value and net realisable value.', 'Coût, juste valeur et valeur nette de réalisation.', 14],
      ['Equity presentation', 'Présentation des capitaux propres', 'Capital, reserves and retained earnings.', 'Capital, réserves et report à nouveau.', 10],
    ]),
    mod('The Income Statement', 'Le compte de résultat', 'Performance over the period.', 'La performance sur la période.', [
      ['By nature or by function', 'Par nature ou par fonction', 'Two ways to present expenses.', 'Deux façons de présenter les charges.', 12],
      ['Operating, financial and exceptional items', "Résultats d'exploitation, financier et exceptionnel", 'Separate recurring from non-recurring performance.', 'Distinguez la performance récurrente de la performance exceptionnelle.', 12],
      ['From revenue to net income', 'Du chiffre d’affaires au résultat net', 'Build the statement line by line, tax included.', 'Construisez le compte ligne par ligne, impôt compris.', 14],
    ]),
    mod('The Cash Flow Statement', 'Le tableau de flux de trésorerie', 'Where cash came from and where it went.', "D'où vient la trésorerie et où elle est allée.", [
      ['Operating, investing and financing activities', "Activités opérationnelles, d'investissement et de financement", 'Classify each cash movement correctly.', 'Classez correctement chaque mouvement de trésorerie.', 12],
      ['Cash flow statement: indirect method', 'Tableau de flux : méthode indirecte', 'Start from net income and adjust.', 'Partez du résultat net et corrigez-le.', 18],
      ['Reconciling with the balance sheet', 'Réconciliation avec le bilan', 'Prove that cash flows explain the change in cash.', 'Prouvez que les flux expliquent la variation de trésorerie.', 12],
    ]),
    mod('Notes and Analysis', 'Annexe et analyse', 'Explain the numbers and interpret them.', 'Expliquez les chiffres et interprétez-les.', [
      ['Notes to the financial statements', "L'annexe aux états financiers", 'Accounting policies and key disclosures.', 'Méthodes comptables et principales informations à fournir.', 14],
      ['Ratio analysis: liquidity and solvency', 'Analyse par ratios : liquidité et solvabilité', 'Can the company pay its debts?', "L'entreprise peut-elle honorer ses dettes ?", 14],
      ['Ratio analysis: profitability', 'Analyse par ratios : rentabilité', 'Margins, return on assets and return on equity.', 'Marges, rentabilité économique et rentabilité financière.', 14],
    ]),
  ],
};

export const taxationIrppIs: SeedCourse = {
  slug: 'taxation-irpp-is',
  category: 'accounting',
  year: '2nd-year',
  title: l('Taxation — IRPP & Corporate Income Tax', 'Fiscalité — IRPP et IS'),
  short: l(
    'Understand and compute personal income tax (IRPP) and corporate income tax (IS), from taxable base to tax return.',
    "Comprenez et calculez l'impôt sur le revenu des personnes physiques (IRPP) et l'impôt sur les sociétés (IS), de l'assiette à la déclaration.",
  ),
  description: l(
    'Taxation connects accounting to the law. This course explains how income is taxed for individuals (IRPP — personal income tax) and for companies (IS — corporate income tax): who is taxable, how the taxable base is built, which deductions apply and how returns and payments are made.\n\nBecause tax rules evolve, the course teaches the reasoning and the method — and trains you to read the current tax code — rather than asking you to memorise rates.',
    "La fiscalité relie la comptabilité au droit. Ce cours explique comment les revenus sont imposés pour les particuliers (IRPP — impôt sur le revenu des personnes physiques) et pour les sociétés (IS — impôt sur les sociétés) : qui est imposable, comment se construit l'assiette, quelles déductions s'appliquent et comment se font déclarations et paiements.\n\nLes règles fiscales évoluant, le cours enseigne le raisonnement et la méthode — et vous entraîne à lire le code fiscal en vigueur — plutôt que de vous faire mémoriser des taux.",
  ),
  level: 'INTERMEDIATE',
  duration: { value: 10, unit: 'WEEKS' },
  objectives: pairs([
    ['Explain the principles and structure of the tax system', 'Expliquer les principes et la structure du système fiscal'],
    ['Determine taxable income for individuals (IRPP)', "Déterminer le revenu imposable des personnes physiques (IRPP)"],
    ['Move from accounting profit to taxable profit for companies (IS)', 'Passer du résultat comptable au résultat fiscal des sociétés (IS)'],
    ['Apply loss carry-forward and advance-payment rules', "Appliquer les règles de report des déficits et d'acomptes provisionnels"],
    ['Prepare tax computations and avoid common errors', 'Établir des calculs d’impôt et éviter les erreurs courantes'],
  ]),
  audience: pairs([
    ['Second-year accounting and finance students', 'Étudiants de deuxième année en comptabilité et finance'],
    ['Accountants who prepare tax returns', 'Comptables qui préparent des déclarations fiscales'],
    ['Entrepreneurs who want to understand their tax obligations', 'Entrepreneurs qui veulent comprendre leurs obligations fiscales'],
  ]),
  skills: pairs([
    ['Personal income tax (IRPP)', 'Impôt sur le revenu (IRPP)'],
    ['Corporate income tax (IS)', 'Impôt sur les sociétés (IS)'],
    ['Tax computation', "Calcul de l'impôt"],
    ['Tax returns', 'Déclarations fiscales'],
    ['Tax compliance', 'Conformité fiscale'],
  ]),
  faq: [
    { q: l('Are tax rates included?', 'Les taux d’imposition sont-ils inclus ?'), a: l('Cases use the rates of the current tax code, but the course focuses on method so you can update your knowledge when the law changes.', 'Les cas utilisent les taux du code fiscal en vigueur, mais le cours se concentre sur la méthode pour que vous puissiez actualiser vos connaissances quand la loi change.') },
    { q: l('What do IRPP and IS stand for?', 'Que signifient IRPP et IS ?'), a: l('IRPP is personal income tax (Impôt sur le Revenu des Personnes Physiques) and IS is corporate income tax (Impôt sur les Sociétés).', "L'IRPP est l'impôt sur le revenu des personnes physiques et l'IS est l'impôt sur les sociétés.") },
  ],
  modules: [
    mod('Tax Fundamentals', 'Les fondamentaux de la fiscalité', 'The vocabulary and logic of taxation.', 'Le vocabulaire et la logique de la fiscalité.', [
      ['The tax system and its principles', 'Le système fiscal et ses principes', 'Legality, equality, and the sources of tax law.', 'Légalité, égalité et sources du droit fiscal.', 14],
      ['Taxpayers, tax base and rates', 'Contribuables, assiette et taux', 'Who pays, on what, and how much.', 'Qui paie, sur quoi et combien.', 12],
      ['Filing and payment obligations', 'Obligations déclaratives et de paiement', 'Deadlines, returns and penalties.', 'Échéances, déclarations et pénalités.', 12],
    ]),
    mod('Personal Income Tax (IRPP)', "Impôt sur le revenu (IRPP)", 'How individuals are taxed on their income.', 'Comment les particuliers sont imposés sur leurs revenus.', [
      ['Income categories', 'Catégories de revenus', 'Employment, business, professional, property and investment income.', 'Salaires, bénéfices commerciaux, professions libérales, revenus fonciers et de capitaux.', 14],
      ['Determining taxable income', 'Détermination du revenu imposable', 'From gross income to net taxable income.', 'Du revenu brut au revenu net imposable.', 14],
      ['Deductions and progressive scale', 'Déductions et barème progressif', 'Personal allowances and how a progressive scale is applied.', 'Abattements personnels et application d’un barème progressif.', 16],
      ['Withholding and annual return', 'Retenue à la source et déclaration annuelle', 'Advance collection and year-end filing.', 'Prélèvement à la source et déclaration annuelle.', 12],
    ]),
    mod('Corporate Income Tax (IS)', 'Impôt sur les sociétés (IS)', 'How companies are taxed on their profit.', 'Comment les sociétés sont imposées sur leur bénéfice.', [
      ['Scope and taxable profit', "Champ d'application et résultat imposable", 'Which entities are taxable and on what.', 'Quelles entités sont imposables et sur quoi.', 12],
      ['Reintegrations and deductions', 'Réintégrations et déductions', 'From accounting profit to taxable profit.', 'Du résultat comptable au résultat fiscal.', 18],
      ['Loss carry-forward', 'Report des déficits', 'Use past losses against future profits.', 'Imputez les pertes passées sur les bénéfices futurs.', 10],
      ['Advance payments and return', 'Acomptes provisionnels et déclaration', 'Instalments during the year and the annual return.', "Acomptes en cours d'année et déclaration annuelle.", 12],
    ]),
    mod('Practical Cases', 'Cas pratiques', 'Apply the method end to end.', 'Appliquez la méthode de bout en bout.', [
      ['IRPP case study', 'Cas pratique IRPP', 'Compute the tax of an individual with several income sources.', 'Calculez l’impôt d’un particulier ayant plusieurs sources de revenus.', 25, 'ASSIGNMENT'],
      ['IS case study', 'Cas pratique IS', 'Reconcile accounting and tax profit for a company.', 'Réconciliez résultat comptable et résultat fiscal pour une société.', 30, 'ASSIGNMENT'],
      ['Common errors and tax risks', 'Erreurs courantes et risques fiscaux', 'What auditors and tax authorities look for.', "Ce que recherchent les auditeurs et l'administration fiscale.", 14],
    ]),
  ],
};

export const financialAudit: SeedCourse = {
  slug: 'financial-audit',
  category: 'accounting',
  year: '3rd-year',
  title: l('Financial Audit', 'Audit Financier'),
  short: l(
    'Learn how auditors plan, gather evidence and form an opinion on financial statements.',
    "Apprenez comment les auditeurs planifient leurs travaux, réunissent des éléments probants et forment une opinion sur les états financiers.",
  ),
  description: l(
    'Financial audit gives users confidence in the numbers. This course follows the audit from acceptance and planning to the final report: risk assessment, internal control, evidence gathering, sampling and the audit opinion.\n\nYou learn the logic of international auditing standards (ISA) and practise professional judgement on realistic situations.',
    "L'audit financier donne confiance dans les chiffres. Ce cours suit la mission de l'acceptation et de la planification jusqu'au rapport final : évaluation des risques, contrôle interne, collecte d'éléments probants, sondages et opinion d'audit.\n\nVous découvrez la logique des normes internationales d'audit (ISA) et exercez votre jugement professionnel sur des situations réalistes.",
  ),
  level: 'ADVANCED',
  duration: { value: 10, unit: 'WEEKS' },
  objectives: pairs([
    ['Explain the objectives, ethics and standards of financial audit', "Expliquer les objectifs, l'éthique et les normes de l'audit financier"],
    ['Assess risk and set materiality when planning an audit', 'Évaluer les risques et fixer le seuil de signification lors de la planification'],
    ['Evaluate internal control and design tests of controls', 'Évaluer le contrôle interne et concevoir des tests de procédures'],
    ['Select substantive procedures, samples and confirmations', 'Choisir des contrôles substantifs, des sondages et des confirmations'],
    ['Conclude with the right audit opinion and report', 'Conclure par la bonne opinion et le bon rapport d’audit'],
  ]),
  audience: pairs([
    ['Third-year accounting and finance students', 'Étudiants de troisième année en comptabilité et finance'],
    ['Junior auditors and audit trainees', 'Auditeurs juniors et stagiaires en cabinet'],
    ['Accountants moving into assurance roles', "Comptables évoluant vers des missions d'assurance"],
  ]),
  skills: pairs([
    ['Audit planning', "Planification d'audit"],
    ['Risk assessment', 'Évaluation des risques'],
    ['Internal control', 'Contrôle interne'],
    ['Audit evidence', 'Éléments probants'],
    ['Professional judgement', 'Jugement professionnel'],
    ['ISA', 'Normes ISA'],
  ]),
  faq: [
    { q: l('Do I need prior accounting knowledge?', 'Faut-il des connaissances comptables préalables ?'), a: l('Yes — a good grasp of financial statements is expected. Intermediate Accounting and Preparation of Financial Statements are ideal preparation.', 'Oui — une bonne compréhension des états financiers est attendue. Comptabilité Intermédiaire et Élaboration des États Financiers sont une préparation idéale.') },
    { q: l('Which standards does the course follow?', 'Quelles normes le cours suit-il ?'), a: l('The International Standards on Auditing (ISA), with notes where local regulation differs.', "Les normes internationales d'audit (ISA), avec des remarques là où la réglementation locale diffère.") },
  ],
  modules: [
    mod('Introduction to Audit', "Introduction à l'audit", 'What audit is for and the rules it operates under.', "À quoi sert l'audit et les règles qui l'encadrent.", [
      ['Purpose and types of audit', "Objectifs et types d'audit", 'Statutory, internal and external audit compared.', "Audit légal, interne et externe comparés.", 14],
      ['Ethics and independence', 'Éthique et indépendance', 'Integrity, objectivity and threats to independence.', "Intégrité, objectivité et menaces sur l'indépendance.", 14],
      ['Auditing standards (ISA)', "Normes d'audit (ISA)", 'The structure and logic of international standards.', 'La structure et la logique des normes internationales.', 14],
    ]),
    mod('Planning and Risk Assessment', 'Planification et évaluation des risques', 'Focus the work where misstatement is most likely.', 'Concentrez les travaux là où les anomalies sont les plus probables.', [
      ['Understanding the entity', "Connaissance de l'entité", 'Business, environment and reporting framework.', 'Activité, environnement et référentiel comptable.', 14],
      ['Materiality', 'Seuil de signification', 'Setting overall and performance materiality.', "Détermination du seuil global et du seuil d'exécution.", 14],
      ['The audit risk model', "Le modèle de risque d'audit", 'Inherent, control and detection risk.', 'Risque inhérent, risque lié au contrôle et risque de non-détection.', 16],
    ]),
    mod('Internal Control', 'Contrôle interne', 'Assess the systems that prevent and detect errors.', 'Évaluez les dispositifs qui préviennent et détectent les erreurs.', [
      ['Control environment', 'Environnement de contrôle', 'Governance, culture and risk management.', 'Gouvernance, culture et gestion des risques.', 12],
      ['Walkthroughs and tests of controls', 'Cheminements et tests de procédures', 'Confirm that controls exist and operate.', 'Vérifiez que les contrôles existent et fonctionnent.', 16],
      ['Reporting control weaknesses', 'Communication des faiblesses de contrôle', 'How and to whom to report deficiencies.', 'Comment et à qui communiquer les faiblesses.', 10],
    ]),
    mod('Audit Evidence and Procedures', 'Éléments probants et procédures', 'Gather sufficient, appropriate evidence.', 'Réunissez des éléments probants suffisants et appropriés.', [
      ['Substantive procedures', 'Contrôles substantifs', 'Tests of details and analytical procedures.', 'Contrôles de détail et procédures analytiques.', 16],
      ['Audit sampling', 'Sondages en audit', 'Statistical and non-statistical sampling.', 'Sondages statistiques et non statistiques.', 14],
      ['Confirmations and analytical procedures', 'Confirmations et procédures analytiques', 'External evidence and reasonableness tests.', 'Éléments externes et tests de vraisemblance.', 14],
    ]),
    mod('Completion and Reporting', 'Finalisation et rapport', 'Conclude and communicate.', 'Concluez et communiquez.', [
      ['Going concern', "Continuité d'exploitation", 'Assess whether the entity can continue operating.', "Évaluez si l'entité peut poursuivre son exploitation.", 14],
      ['Evaluating misstatements', 'Évaluation des anomalies', 'Accumulate, evaluate and communicate misstatements.', 'Cumulez, évaluez et communiquez les anomalies.', 12],
      ['The audit opinion and report', "L'opinion et le rapport d'audit", 'Unmodified, qualified, adverse and disclaimer opinions.', "Opinion sans réserve, avec réserve, défavorable et impossibilité d'exprimer une opinion.", 16],
    ]),
  ],
};

export const taxBenefits: SeedCourse = {
  slug: 'tax-benefits',
  category: 'accounting',
  year: '3rd-year',
  title: l('Tax Benefits', 'Avantages Fiscaux'),
  short: l(
    'Identify, claim and document the tax incentives available to businesses — while staying compliant.',
    'Identifiez, demandez et documentez les avantages fiscaux accessibles aux entreprises — tout en restant en conformité.',
  ),
  description: l(
    'Governments use tax incentives to encourage investment, exports, employment and regional development. This course explains the main families of tax benefits, how eligibility works, how to claim them correctly and how to defend them in a tax review.\n\nThe focus is on the reasoning and on documentation, so you can apply the current legislation of any jurisdiction with confidence.',
    "Les États utilisent les incitations fiscales pour encourager l'investissement, l'exportation, l'emploi et le développement régional. Ce cours présente les grandes familles d'avantages fiscaux, le fonctionnement de l'éligibilité, la manière de les revendiquer correctement et de les défendre lors d'un contrôle.\n\nL'accent est mis sur le raisonnement et la documentation, afin que vous puissiez appliquer en confiance la législation en vigueur.",
  ),
  level: 'ADVANCED',
  duration: { value: 6, unit: 'WEEKS' },
  objectives: pairs([
    ['Distinguish exemptions, deductions, credits and deferrals', 'Distinguer exonérations, déductions, crédits et reports'],
    ['Assess whether a company or project is eligible for an incentive', 'Apprécier si une entreprise ou un projet est éligible à un avantage'],
    ['Quantify the benefit of investment and reinvestment schemes', 'Chiffrer l’avantage des dispositifs d’investissement et de réinvestissement'],
    ['Document eligibility and anticipate audits and claw-back', 'Documenter l’éligibilité et anticiper contrôles et remises en cause'],
  ]),
  audience: pairs([
    ['Third-year accounting and finance students', 'Étudiants de troisième année en comptabilité et finance'],
    ['Tax and accounting professionals', 'Professionnels de la fiscalité et de la comptabilité'],
    ['Business owners planning investments', 'Dirigeants qui préparent des investissements'],
  ]),
  skills: pairs([
    ['Tax incentives', 'Incitations fiscales'],
    ['Eligibility analysis', "Analyse d'éligibilité"],
    ['Tax planning', 'Planification fiscale'],
    ['Compliance documentation', 'Documentation de conformité'],
  ]),
  faq: [
    { q: l('Is this course specific to one country?', 'Ce cours est-il propre à un pays ?'), a: l('It teaches the common logic of tax incentives and shows how to apply the legislation currently in force.', "Il enseigne la logique commune des incitations fiscales et montre comment appliquer la législation en vigueur.") },
  ],
  modules: [
    mod('Understanding Tax Incentives', 'Comprendre les incitations fiscales', 'The purpose and the toolbox.', 'La finalité et la boîte à outils.', [
      ['Why governments grant incentives', "Pourquoi l'État accorde des avantages", 'Economic goals behind tax incentives.', 'Les objectifs économiques des incitations fiscales.', 12],
      ['Types of tax benefits', "Types d'avantages fiscaux", 'Exemptions, deductions, credits and deferrals.', 'Exonérations, déductions, crédits et reports.', 14],
      ['Eligibility principles', "Principes d'éligibilité", 'Conditions, thresholds and time limits.', 'Conditions, seuils et durées.', 12],
    ]),
    mod('Investment and Reinvestment Incentives', "Incitations à l'investissement et au réinvestissement", 'Rewarding capital that stays in the business.', 'Récompenser les capitaux qui restent dans l’entreprise.', [
      ['Investment deductions', 'Déductions pour investissement', 'Deducting qualifying investment from taxable profit.', 'Déduire du bénéfice imposable les investissements éligibles.', 14],
      ['Reinvestment of profits', 'Réinvestissement des bénéfices', 'Conditions for benefiting from reinvested profits.', 'Conditions pour bénéficier des bénéfices réinvestis.', 14],
      ['Regional development incentives', 'Incitations au développement régional', 'Advantages linked to where the business operates.', 'Avantages liés au lieu d’implantation de l’activité.', 12],
    ]),
    mod('Sector, Export and Employment Incentives', "Incitations sectorielles, à l'export et à l'emploi", 'Targeted schemes for specific activities.', 'Dispositifs ciblés pour des activités précises.', [
      ['Export incentives', "Avantages à l'exportation", 'Benefits for companies that sell abroad.', 'Avantages pour les entreprises qui vendent à l’étranger.', 12],
      ['Priority sectors and SMEs', 'Secteurs prioritaires et PME', 'Schemes for strategic sectors and small companies.', 'Dispositifs pour les secteurs stratégiques et les petites entreprises.', 12],
      ['Employment incentives', "Incitations à l'emploi", 'Benefits linked to hiring and training.', 'Avantages liés au recrutement et à la formation.', 12],
    ]),
    mod('Compliance and Planning', 'Conformité et planification', 'Claim benefits you can defend.', 'Revendiquez des avantages que vous pouvez défendre.', [
      ['Conditions, controls and claw-back', 'Conditions, contrôles et remise en cause', 'What happens when a condition is no longer met.', 'Ce qui se passe quand une condition n’est plus remplie.', 12],
      ['Documenting eligibility', "Justifier son éligibilité", 'Evidence to keep, and for how long.', 'Les justificatifs à conserver, et combien de temps.', 12],
      ['Tax planning versus tax avoidance', "Planification fiscale et évitement de l'impôt", 'Where legitimate planning ends.', 'Où s’arrête la planification légitime.', 14],
      ['Case study', 'Étude de cas', 'Evaluate incentives for an investment project.', 'Évaluez les incitations pour un projet d’investissement.', 30, 'ASSIGNMENT'],
    ]),
  ],
};

export const ifrs: SeedCourse = {
  slug: 'ifrs',
  category: 'accounting',
  year: '3rd-year',
  title: l('IFRS — International Financial Reporting Standards', 'IFRS'),
  short: l(
    'Understand and apply the international standards used by listed companies and multinational groups.',
    'Comprenez et appliquez les normes internationales utilisées par les sociétés cotées et les groupes multinationaux.',
  ),
  description: l(
    'IFRS are the common language of financial reporting across most of the world. This course introduces the framework and the standards you meet most often in practice: presentation, property, plant and equipment, intangibles, inventories, impairment, revenue, leases, financial instruments, consolidation and income taxes.\n\nEach standard is explained through its core principle, a short example and the typical judgement calls.',
    "Les IFRS sont le langage commun de l'information financière dans la plupart des pays. Ce cours présente le référentiel et les normes que l'on rencontre le plus en pratique : présentation, immobilisations corporelles et incorporelles, stocks, dépréciation, produits, contrats de location, instruments financiers, consolidation et impôts sur le résultat.\n\nChaque norme est expliquée par son principe fondamental, un exemple court et les principaux points de jugement.",
  ),
  level: 'ADVANCED',
  duration: { value: 8, unit: 'WEEKS' },
  objectives: pairs([
    ['Explain the role of IFRS and the Conceptual Framework', 'Expliquer le rôle des IFRS et du Cadre conceptuel'],
    ['Account for assets under IAS 16, IAS 38, IAS 2 and IAS 36', 'Comptabiliser les actifs selon IAS 16, IAS 38, IAS 2 et IAS 36'],
    ['Recognise revenue under the five-step model of IFRS 15', 'Comptabiliser les produits selon le modèle en cinq étapes d’IFRS 15'],
    ['Apply the lessee model of IFRS 16', 'Appliquer le modèle du preneur d’IFRS 16'],
    ['Classify and impair financial instruments under IFRS 9', 'Classer et déprécier les instruments financiers selon IFRS 9'],
  ]),
  audience: pairs([
    ['Third-year accounting and finance students', 'Étudiants de troisième année en comptabilité et finance'],
    ['Accountants working for groups reporting under IFRS', 'Comptables de groupes publiant selon les IFRS'],
    ['Auditors and financial analysts', 'Auditeurs et analystes financiers'],
  ]),
  skills: pairs([
    ['IFRS', 'IFRS'],
    ['Financial reporting', 'Reporting financier'],
    ['Revenue recognition', 'Comptabilisation des produits'],
    ['Lease accounting', 'Comptabilisation des locations'],
    ['Financial instruments', 'Instruments financiers'],
    ['Consolidation', 'Consolidation'],
  ]),
  faq: [
    { q: l('What is the difference between IFRS and IAS?', 'Quelle différence entre IFRS et IAS ?'), a: l('IAS are the older standards issued before 2001 and IFRS the newer ones; both are part of "IFRS Accounting Standards" and remain in force.', 'Les IAS sont les normes plus anciennes publiées avant 2001 et les IFRS les plus récentes ; les deux font partie des « normes comptables IFRS » et restent en vigueur.') },
    { q: l('Do I need to know local accounting rules first?', 'Faut-il connaître les règles comptables locales avant ?'), a: l('A solid grounding in financial statements is enough; comparisons with local rules are highlighted where useful.', "De bonnes bases sur les états financiers suffisent ; des comparaisons avec les règles locales sont signalées lorsque c'est utile.") },
  ],
  modules: [
    mod('The IFRS Framework', 'Le référentiel IFRS', 'Who issues IFRS, who applies them, and the ideas underneath.', 'Qui émet les IFRS, qui les applique, et les idées qui les fondent.', [
      ['What IFRS are and who uses them', 'Que sont les IFRS et qui les utilise', 'History, governance and adoption around the world.', 'Histoire, gouvernance et adoption dans le monde.', 12],
      ['The Conceptual Framework', 'Le Cadre conceptuel', 'Objectives, qualitative characteristics and definitions.', 'Objectifs, caractéristiques qualitatives et définitions.', 14],
      ['Presentation of financial statements (IAS 1)', 'Présentation des états financiers (IAS 1)', 'Components, structure and fair presentation.', 'Composants, structure et image fidèle.', 14],
      ['First-time adoption (IFRS 1)', 'Première application (IFRS 1)', 'Moving from local GAAP to IFRS.', 'Passer des normes locales aux IFRS.', 12],
    ]),
    mod('Assets', 'Actifs', 'Recognise, measure and impair what the company controls.', "Comptabilisez, évaluez et dépréciez ce que l'entreprise contrôle.", [
      ['Property, plant and equipment (IAS 16)', 'Immobilisations corporelles (IAS 16)', 'Cost model, revaluation model and components.', 'Modèle du coût, modèle de la réévaluation et composants.', 16],
      ['Intangible assets (IAS 38)', 'Immobilisations incorporelles (IAS 38)', 'Recognition criteria and development costs.', 'Critères de comptabilisation et frais de développement.', 14],
      ['Inventories (IAS 2)', 'Stocks (IAS 2)', 'Cost, cost formulas and net realisable value.', 'Coût, formules de coût et valeur nette de réalisation.', 12],
      ['Impairment of assets (IAS 36)', "Dépréciation d'actifs (IAS 36)", 'Recoverable amount and cash-generating units.', 'Valeur recouvrable et unités génératrices de trésorerie.', 16],
    ]),
    mod('Revenue and Leases', 'Produits et contrats de location', 'Two standards that changed everyday accounting.', 'Deux normes qui ont changé la comptabilité courante.', [
      ['Revenue: the five-step model (IFRS 15)', 'Produits : le modèle en cinq étapes (IFRS 15)', 'From contract to revenue recognition.', 'Du contrat à la comptabilisation du produit.', 18],
      ['Leases for lessees (IFRS 16)', 'Contrats de location : le preneur (IFRS 16)', 'Right-of-use asset and lease liability.', "Droit d'utilisation et dette locative.", 18],
    ]),
    mod('Financial Instruments', 'Instruments financiers', 'Classify, measure and impair financial assets and liabilities.', 'Classez, évaluez et dépréciez actifs et passifs financiers.', [
      ['Classification and measurement (IFRS 9)', 'Classement et évaluation (IFRS 9)', 'Amortised cost, FVOCI and FVTPL.', 'Coût amorti, JVOCI et JVRN.', 16],
      ['Impairment: expected credit losses', 'Dépréciation : pertes de crédit attendues', 'The three-stage expected loss model.', 'Le modèle de pertes attendues en trois étapes.', 16],
      ['Disclosures (IFRS 7)', 'Informations à fournir (IFRS 7)', 'What users must be told about financial risk.', 'Ce que les utilisateurs doivent savoir sur les risques financiers.', 12],
    ]),
    mod('Groups, Taxes and Events', 'Groupes, impôts et événements', 'Consolidation, deferred tax and post-closing events.', 'Consolidation, impôts différés et événements postérieurs à la clôture.', [
      ['Consolidation and control (IFRS 10)', 'Consolidation et contrôle (IFRS 10)', 'When a parent must consolidate a subsidiary.', 'Quand une mère doit consolider une filiale.', 16],
      ['Business combinations (IFRS 3)', "Regroupements d'entreprises (IFRS 3)", 'The acquisition method and goodwill.', "La méthode de l'acquisition et le goodwill.", 16],
      ['Income taxes (IAS 12)', 'Impôts sur le résultat (IAS 12)', 'Current and deferred tax.', 'Impôt exigible et impôts différés.', 16],
      ['Events after the reporting period (IAS 10)', 'Événements postérieurs à la clôture (IAS 10)', 'Adjusting and non-adjusting events.', 'Événements donnant lieu ou non à ajustement.', 10],
    ]),
  ],
};

export const accountingCourses = [intermediateAccounting, financialStatements, taxationIrppIs, financialAudit, taxBenefits, ifrs];
