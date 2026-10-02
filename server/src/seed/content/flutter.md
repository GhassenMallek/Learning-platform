@@ flutter-development | Variables | en
Dart is statically typed, but it infers types for you.

~~~dart
var city = 'Tunis';               // inferred as String
String country = 'Tunisia';       // explicit type
final createdAt = DateTime.now(); // assigned once, at runtime
const pi = 3.14159;               // compile-time constant
~~~

- **var** lets Dart infer the type; the type is then fixed.
- **final** can be assigned only once; **const** must be known at compile time.
- Prefer `final` by default and `const` for values that never change — `const` widgets make Flutter rebuilds cheaper.
@@ flutter-development | Variables | fr
Dart est typé statiquement, mais il déduit les types à votre place.

~~~dart
var city = 'Tunis';               // type déduit : String
String country = 'Tunisie';       // type explicite
final createdAt = DateTime.now(); // affectée une seule fois, à l'exécution
const pi = 3.14159;               // constante connue à la compilation
~~~

- **var** laisse Dart déduire le type ; il reste ensuite figé.
- **final** ne peut être affectée qu'une seule fois ; **const** doit être connue dès la compilation.
- Privilégiez `final` par défaut et `const` pour les valeurs immuables : les widgets `const` rendent les reconstructions de Flutter moins coûteuses.
@@ flutter-development | Null safety | en
Since Dart 2.12, types are **non-nullable by default**: a `String` can never be `null`. You opt in with `?`.

~~~dart
String name = 'Sara';   // can never be null
String? nickname;       // may be null

print(nickname?.length);  // safe call → null when nickname is null
print(nickname ?? 'n/a'); // default value
print(nickname!.length);  // "I am sure" — throws if null, use sparingly
~~~

Use `late` only when a value is guaranteed to be set before its first read. Null safety turns a whole class of runtime crashes into compile-time errors.
@@ flutter-development | Null safety | fr
Depuis Dart 2.12, les types sont **non nullables par défaut** : une `String` ne peut jamais valoir `null`. On l'autorise avec `?`.

~~~dart
String name = 'Sara';   // ne peut jamais être null
String? nickname;       // peut être null

print(nickname?.length);  // appel sûr → null si nickname est null
print(nickname ?? 'n/a'); // valeur par défaut
print(nickname!.length);  // « j'en suis sûr » — lève une exception si null, à utiliser avec parcimonie
~~~

N'utilisez `late` que lorsque la valeur est garantie d'être définie avant sa première lecture. La null safety transforme toute une catégorie de plantages à l'exécution en erreurs de compilation.
@@ flutter-development | Async/Await | en
A **Future** represents a value that will be available later — an API response, a file read. `async`/`await` lets you write asynchronous code that reads top to bottom.

~~~dart
Future<User> loadUser(int id) async {
  try {
    final response = await api.get('/users/$id');
    return User.fromJson(response.data);
  } on TimeoutException {
    throw const AppException('The server took too long to answer');
  } finally {
    isLoading = false;
  }
}
~~~

Always handle errors with `try`/`catch`, and never block the UI with long synchronous work.
@@ flutter-development | Async/Await | fr
Un **Future** représente une valeur qui sera disponible plus tard — une réponse d'API, la lecture d'un fichier. `async`/`await` permet d'écrire du code asynchrone qui se lit de haut en bas.

~~~dart
Future<User> loadUser(int id) async {
  try {
    final response = await api.get('/users/$id');
    return User.fromJson(response.data);
  } on TimeoutException {
    throw const AppException('Le serveur a mis trop de temps à répondre');
  } finally {
    isLoading = false;
  }
}
~~~

Gérez toujours les erreurs avec `try`/`catch`, et ne bloquez jamais l'interface avec un long traitement synchrone.
@@ flutter-development | What is Flutter? | en
Flutter is Google's open-source UI toolkit for building **mobile, web and desktop** apps from a single Dart codebase.

- It draws every pixel itself, so your interface looks the same on every device.
- **Hot reload** shows code changes in under a second.
- Everything is a **widget**: buttons, padding, even layout rules.

In this lesson you install the SDK, create your first project with `flutter create` and run it on an emulator.
@@ flutter-development | What is Flutter? | fr
Flutter est le kit d'interface open source de Google pour créer des applications **mobiles, web et desktop** à partir d'une seule base de code Dart.

- Il dessine lui-même chaque pixel : votre interface est identique sur tous les appareils.
- Le **hot reload** affiche les modifications du code en moins d'une seconde.
- Tout est **widget** : boutons, marges, et même les règles de mise en page.

Dans cette leçon, vous installez le SDK, créez votre premier projet avec `flutter create` et le lancez sur un émulateur.
@@ flutter-development | StatelessWidget | en
A **StatelessWidget** describes UI that depends only on its constructor arguments — it never changes by itself.

~~~dart
class PriceTag extends StatelessWidget {
  const PriceTag({super.key, required this.amount});
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Text('$amount TND', style: Theme.of(context).textTheme.titleMedium);
  }
}
~~~

Use it whenever the widget only displays data it is given. It is the simplest and cheapest kind of widget.
@@ flutter-development | StatelessWidget | fr
Un **StatelessWidget** décrit une interface qui ne dépend que des arguments de son constructeur : elle ne change jamais d'elle-même.

~~~dart
class PriceTag extends StatelessWidget {
  const PriceTag({super.key, required this.amount});
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Text('$amount TND', style: Theme.of(context).textTheme.titleMedium);
  }
}
~~~

Utilisez-le dès que le widget se contente d'afficher les données qu'on lui transmet. C'est le type de widget le plus simple et le moins coûteux.
@@ flutter-development | StatefulWidget | en
A **StatefulWidget** owns mutable state that lives in a companion `State` object. Calling `setState` schedules a rebuild.

~~~dart
class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: () => setState(() => _count++),
      child: Text('Clicked $_count times'),
    );
  }
}
~~~

The `State` object survives rebuilds, which is why the counter keeps its value.
@@ flutter-development | StatefulWidget | fr
Un **StatefulWidget** possède un état modifiable, conservé dans un objet `State` associé. Appeler `setState` planifie une reconstruction.

~~~dart
class Counter extends StatefulWidget {
  const Counter({super.key});

  @override
  State<Counter> createState() => _CounterState();
}

class _CounterState extends State<Counter> {
  int _count = 0;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: () => setState(() => _count++),
      child: Text('Cliqué $_count fois'),
    );
  }
}
~~~

L'objet `State` survit aux reconstructions, c'est pourquoi le compteur conserve sa valeur.
@@ flutter-development | Forms | en
A `Form` groups fields and validates them together through a `GlobalKey<FormState>`.

~~~dart
final _formKey = GlobalKey<FormState>();

Form(
  key: _formKey,
  child: Column(children: [
    TextFormField(
      decoration: const InputDecoration(labelText: 'Email'),
      validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
    ),
    FilledButton(
      onPressed: () {
        if (_formKey.currentState!.validate()) submit();
      },
      child: const Text('Save'),
    ),
  ]),
)
~~~

Return `null` from a validator when the value is valid, or an error message when it is not.
@@ flutter-development | Forms | fr
Un `Form` regroupe des champs et les valide ensemble grâce à une `GlobalKey<FormState>`.

~~~dart
final _formKey = GlobalKey<FormState>();

Form(
  key: _formKey,
  child: Column(children: [
    TextFormField(
      decoration: const InputDecoration(labelText: 'E-mail'),
      validator: (v) => (v == null || !v.contains('@')) ? 'Saisissez un e-mail valide' : null,
    ),
    FilledButton(
      onPressed: () {
        if (_formKey.currentState!.validate()) submit();
      },
      child: const Text('Enregistrer'),
    ),
  ]),
)
~~~

Un validateur renvoie `null` quand la valeur est valide, ou un message d'erreur dans le cas contraire.
@@ flutter-development | Responsive UI | en
Adapt the layout to the space you are given instead of assuming a phone.

~~~dart
LayoutBuilder(
  builder: (context, constraints) {
    final wide = constraints.maxWidth >= 900;
    return wide
        ? Row(children: const [Expanded(child: Sidebar()), Expanded(flex: 3, child: Content())])
        : const Content();
  },
)
~~~

- **MediaQuery** gives screen-level information (size, text scale, orientation).
- **LayoutBuilder** gives the space available to *this* widget — usually the better tool.
@@ flutter-development | Responsive UI | fr
Adaptez la mise en page à l'espace disponible au lieu de supposer un téléphone.

~~~dart
LayoutBuilder(
  builder: (context, constraints) {
    final wide = constraints.maxWidth >= 900;
    return wide
        ? Row(children: const [Expanded(child: Sidebar()), Expanded(flex: 3, child: Content())])
        : const Content();
  },
)
~~~

- **MediaQuery** fournit des informations sur l'écran (taille, échelle du texte, orientation).
- **LayoutBuilder** fournit l'espace disponible pour *ce* widget — c'est généralement le meilleur outil.
@@ flutter-development | setState | en
`setState` is the built-in way to update local UI state.

**Use it for:** a toggle, the selected tab, whether a password is visible — state that belongs to one widget and is thrown away with it.

**Avoid it for:** data shared between screens, data fetched from an API, or logic you want to test. The widget then becomes a tangle of state and UI code.

It has no dependencies and no learning curve — which makes it the right starting point and the wrong ending point.
@@ flutter-development | setState | fr
`setState` est le moyen natif de mettre à jour un état d'interface local.

**À utiliser pour :** un interrupteur, l'onglet sélectionné, la visibilité d'un mot de passe — un état qui appartient à un seul widget et disparaît avec lui.

**À éviter pour :** les données partagées entre écrans, les données issues d'une API ou la logique que l'on veut tester. Le widget devient alors un enchevêtrement d'état et de code d'interface.

Il n'a aucune dépendance ni courbe d'apprentissage : c'est donc le bon point de départ, mais pas le bon point d'arrivée.
@@ flutter-development | Provider | en
**Provider** exposes objects to the widget tree; widgets rebuild when a `ChangeNotifier` calls `notifyListeners`.

~~~dart
class CartModel extends ChangeNotifier {
  final _items = <Product>[];
  List<Product> get items => List.unmodifiable(_items);
  void add(Product p) { _items.add(p); notifyListeners(); }
}

// Provide it once…
ChangeNotifierProvider(create: (_) => CartModel(), child: const App());
// …and read it anywhere below.
final count = context.watch<CartModel>().items.length;
~~~

**Use it for:** small to medium apps and teams new to Flutter. **Watch out for:** manual wiring and `BuildContext` dependence as the app grows.
@@ flutter-development | Provider | fr
**Provider** expose des objets à l'arbre de widgets ; les widgets se reconstruisent quand un `ChangeNotifier` appelle `notifyListeners`.

~~~dart
class CartModel extends ChangeNotifier {
  final _items = <Product>[];
  List<Product> get items => List.unmodifiable(_items);
  void add(Product p) { _items.add(p); notifyListeners(); }
}

// On le fournit une fois…
ChangeNotifierProvider(create: (_) => CartModel(), child: const App());
// …et on le lit n'importe où en dessous.
final count = context.watch<CartModel>().items.length;
~~~

**À utiliser pour :** les applications petites à moyennes et les équipes qui découvrent Flutter. **Attention à :** l'assemblage manuel et la dépendance à `BuildContext` quand l'application grandit.
@@ flutter-development | GetX | en
**GetX** bundles state management, routing and dependency injection in one package with very little boilerplate.

~~~dart
class CounterController extends GetxController {
  final count = 0.obs;
  void increment() => count++;
}

// In the UI
final c = Get.put(CounterController());
Obx(() => Text('${c.count}'));
~~~

**Use it for:** prototypes and small internal tools where speed matters. **Watch out for:** tight coupling, non-idiomatic patterns and a global service locator that makes large codebases harder to test and maintain.
@@ flutter-development | GetX | fr
**GetX** regroupe gestion d'état, routage et injection de dépendances dans un seul paquet, avec très peu de code répétitif.

~~~dart
class CounterController extends GetxController {
  final count = 0.obs;
  void increment() => count++;
}

// Dans l'interface
final c = Get.put(CounterController());
Obx(() => Text('${c.count}'));
~~~

**À utiliser pour :** les prototypes et petits outils internes où la rapidité prime. **Attention à :** le couplage fort, les schémas non idiomatiques et un localisateur de services global qui complique tests et maintenance dans les grands projets.
@@ flutter-development | Riverpod | en
**Riverpod** declares state as global, compile-safe *providers* that do not depend on `BuildContext`.

~~~dart
final todosProvider = FutureProvider.autoDispose<List<Todo>>((ref) {
  return ref.watch(todoRepositoryProvider).fetchTodos();
});

// In the UI
final todos = ref.watch(todosProvider);
return todos.when(
  data: (items) => TodoList(items),
  loading: () => const CircularProgressIndicator(),
  error: (e, _) => ErrorView(e),
);
~~~

**Use it for:** medium to large apps, asynchronous data and code that must be easy to test. **Watch out for:** a steeper learning curve than Provider.
@@ flutter-development | Riverpod | fr
**Riverpod** déclare l'état sous forme de *providers* globaux, sûrs à la compilation, qui ne dépendent pas de `BuildContext`.

~~~dart
final todosProvider = FutureProvider.autoDispose<List<Todo>>((ref) {
  return ref.watch(todoRepositoryProvider).fetchTodos();
});

// Dans l'interface
final todos = ref.watch(todosProvider);
return todos.when(
  data: (items) => TodoList(items),
  loading: () => const CircularProgressIndicator(),
  error: (e, _) => ErrorView(e),
);
~~~

**À utiliser pour :** les applications moyennes à grandes, les données asynchrones et le code qui doit être facile à tester. **Attention à :** une courbe d'apprentissage plus raide que Provider.
@@ flutter-development | BLoC / Cubit | en
**BLoC** turns events into states through a stream; **Cubit** is the lighter version that exposes methods instead of events.

~~~dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}

// In the UI
BlocBuilder<CounterCubit, int>(
  builder: (context, count) => Text('$count'),
);
~~~

**Use it for:** large teams, complex flows and projects that need a strict, predictable structure. Start with Cubit; move to BLoC when you need to trace events. **Watch out for:** more boilerplate.
@@ flutter-development | BLoC / Cubit | fr
**BLoC** transforme des événements en états via un flux ; **Cubit** est la version allégée qui expose des méthodes plutôt que des événements.

~~~dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);
  void increment() => emit(state + 1);
}

// Dans l'interface
BlocBuilder<CounterCubit, int>(
  builder: (context, count) => Text('$count'),
);
~~~

**À utiliser pour :** les grandes équipes, les parcours complexes et les projets qui exigent une structure stricte et prévisible. Commencez par Cubit ; passez à BLoC quand vous devez tracer les événements. **Attention à :** davantage de code répétitif.
@@ flutter-development | Choosing the right approach | en
There is no single best solution — there is the best fit for your app.

| Approach | Best for | Watch out for |
|---|---|---|
| setState | State local to one widget | Sharing state across screens |
| Provider | Small–medium apps, teams new to Flutter | Manual wiring at scale |
| Riverpod | Medium–large apps, async data, testing | Learning curve |
| BLoC / Cubit | Large teams, complex flows, strict structure | Boilerplate |
| GetX | Prototypes, quick internal tools | Tight coupling, non-idiomatic code |

**Rules of thumb**
- Start with `setState`. Reach for a library only when state must be *shared* or *tested*.
- Pick **one** main approach per app and use it consistently.
- Prefer the team's experience over the fashionable choice.
@@ flutter-development | Choosing the right approach | fr
Il n'existe pas de meilleure solution universelle : il existe la meilleure solution pour votre application.

| Approche | Idéale pour | Points de vigilance |
|---|---|---|
| setState | État local à un seul widget | Partage d'état entre écrans |
| Provider | Petites/moyennes applications, équipes débutantes | Assemblage manuel à grande échelle |
| Riverpod | Applications moyennes/grandes, données asynchrones, tests | Courbe d'apprentissage |
| BLoC / Cubit | Grandes équipes, parcours complexes, structure stricte | Code répétitif |
| GetX | Prototypes, petits outils internes | Couplage fort, code non idiomatique |

**Règles pratiques**
- Commencez par `setState`. Ne recourez à une bibliothèque que lorsque l'état doit être *partagé* ou *testé*.
- Choisissez **une** approche principale par application et appliquez-la de façon cohérente.
- Privilégiez l'expérience de l'équipe plutôt que le choix à la mode.
@@ flutter-development | Clean Architecture | en
Clean Architecture separates an app into layers so business rules do not depend on the UI, the database or the network.

~~~text
lib/
├─ presentation/   widgets, pages, state holders (BLoC / Riverpod)
├─ domain/         entities, use cases, repository contracts (pure Dart)
└─ data/           repository implementations, API and database sources, DTOs
~~~

**The dependency rule:** source code dependencies point *inward*. Presentation and data both depend on domain — the domain depends on nothing. That is what makes it easy to test and to replace an API or a database later.
@@ flutter-development | Clean Architecture | fr
La Clean Architecture sépare l'application en couches, pour que les règles métier ne dépendent ni de l'interface, ni de la base de données, ni du réseau.

~~~text
lib/
├─ presentation/   widgets, pages, gestionnaires d'état (BLoC / Riverpod)
├─ domain/         entités, cas d'usage, contrats de repositories (Dart pur)
└─ data/           implémentations de repositories, sources API et base de données, DTO
~~~

**La règle de dépendance :** les dépendances du code source pointent *vers l'intérieur*. La présentation et les données dépendent du domaine — le domaine ne dépend de rien. C'est ce qui facilite les tests et le remplacement ultérieur d'une API ou d'une base de données.
@@ flutter-development | Repository pattern | en
A **repository** hides where data comes from. The domain layer defines the contract; the data layer implements it.

~~~dart
// domain
abstract interface class ProductRepository {
  Future<List<Product>> getProducts();
}

// data
class ProductRepositoryImpl implements ProductRepository {
  ProductRepositoryImpl(this._api, this._cache);
  final ProductApi _api;
  final ProductCache _cache;

  @override
  Future<List<Product>> getProducts() async {
    try {
      final products = await _api.fetchProducts();
      await _cache.save(products);
      return products;
    } on NetworkException {
      return _cache.load(); // offline fallback
    }
  }
}
~~~

The UI asks the repository for products; it never knows whether they came from the network or the cache.
@@ flutter-development | Repository pattern | fr
Un **repository** masque l'origine des données. La couche domaine définit le contrat ; la couche données l'implémente.

~~~dart
// domaine
abstract interface class ProductRepository {
  Future<List<Product>> getProducts();
}

// données
class ProductRepositoryImpl implements ProductRepository {
  ProductRepositoryImpl(this._api, this._cache);
  final ProductApi _api;
  final ProductCache _cache;

  @override
  Future<List<Product>> getProducts() async {
    try {
      final products = await _api.fetchProducts();
      await _cache.save(products);
      return products;
    } on NetworkException {
      return _cache.load(); // repli hors ligne
    }
  }
}
~~~

L'interface demande les produits au repository ; elle ignore s'ils viennent du réseau ou du cache.
@@ flutter-development | Token handling | en
Authenticated APIs return a short-lived **access token**, often with a longer-lived **refresh token**.

1. Store tokens in secure storage (`flutter_secure_storage`), never in plain `SharedPreferences`.
2. Attach the access token to every request with an interceptor.
3. On `401`, request a new access token with the refresh token, then retry once.
4. If refreshing fails, clear the tokens and send the user to the sign-in screen.

~~~dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) async {
    final token = await tokenStore.accessToken();
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  },
));
~~~
@@ flutter-development | Token handling | fr
Les API authentifiées renvoient un **jeton d'accès** de courte durée, souvent accompagné d'un **jeton de rafraîchissement** plus durable.

1. Stockez les jetons dans un stockage sécurisé (`flutter_secure_storage`), jamais dans `SharedPreferences` en clair.
2. Joignez le jeton d'accès à chaque requête avec un intercepteur.
3. Sur une erreur `401`, demandez un nouveau jeton d'accès avec le jeton de rafraîchissement, puis rejouez la requête une fois.
4. Si le rafraîchissement échoue, effacez les jetons et renvoyez l'utilisateur vers l'écran de connexion.

~~~dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) async {
    final token = await tokenStore.accessToken();
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  },
));
~~~
