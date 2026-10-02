@@ java-oop | Encapsulation | en
**Encapsulation** hides an object's internal state and exposes only what callers need.

~~~java
public class BankAccount {
    private double balance;                 // hidden state

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Amount must be positive");
        balance += amount;                  // rules enforced in one place
    }

    public double getBalance() { return balance; }
}
~~~

Make fields `private`, expose behaviour through methods and validate at the boundary. The class can then change its internals without breaking its users.
@@ java-oop | Encapsulation | fr
L'**encapsulation** masque l'état interne d'un objet et n'expose que ce dont les appelants ont besoin.

~~~java
public class BankAccount {
    private double balance;                 // état masqué

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Le montant doit être positif");
        balance += amount;                  // règles appliquées en un seul endroit
    }

    public double getBalance() { return balance; }
}
~~~

Rendez les champs `private`, exposez le comportement par des méthodes et validez aux frontières. La classe peut alors changer son fonctionnement interne sans casser ses utilisateurs.
@@ java-oop | Inheritance | en
Inheritance lets a subclass reuse and specialise a superclass with `extends`.

~~~java
class Employee {
    protected final String name;
    Employee(String name) { this.name = name; }
    double pay() { return 0; }
}

class Manager extends Employee {
    Manager(String name) { super(name); }
    @Override double pay() { return 5000; }
}
~~~

Use it for genuine *is-a* relationships. When you only want to reuse behaviour, prefer **composition** (a `Car` *has an* `Engine`).
@@ java-oop | Inheritance | fr
L'héritage permet à une sous-classe de réutiliser et de spécialiser une superclasse avec `extends`.

~~~java
class Employee {
    protected final String name;
    Employee(String name) { this.name = name; }
    double pay() { return 0; }
}

class Manager extends Employee {
    Manager(String name) { super(name); }
    @Override double pay() { return 5000; }
}
~~~

Réservez-le aux vraies relations *est-un*. Pour simplement réutiliser un comportement, préférez la **composition** (une `Car` *a un* `Engine`).
@@ java-oop | Polymorphism | en
Polymorphism means the same call can behave differently depending on the real type of the object.

~~~java
List<Employee> staff = List.of(new Employee("Ali"), new Manager("Sonia"));
for (Employee e : staff) {
    System.out.println(e.name + " earns " + e.pay());  // the right pay() is chosen at runtime
}
~~~

**Overriding** (runtime, same signature in a subclass) is different from **overloading** (compile time, same name with different parameters).
@@ java-oop | Polymorphism | fr
Le polymorphisme signifie qu'un même appel peut se comporter différemment selon le type réel de l'objet.

~~~java
List<Employee> staff = List.of(new Employee("Ali"), new Manager("Sonia"));
for (Employee e : staff) {
    System.out.println(e.name + " gagne " + e.pay());  // la bonne méthode pay() est choisie à l'exécution
}
~~~

La **redéfinition** (à l'exécution, même signature dans une sous-classe) diffère de la **surcharge** (à la compilation, même nom avec des paramètres différents).
@@ java-oop | Interfaces | en
An **interface** defines a contract without saying how it is fulfilled. A class can implement many interfaces.

~~~java
interface PaymentMethod {
    void pay(double amount);
}

class CardPayment implements PaymentMethod {
    public void pay(double amount) { /* charge the card */ }
}
~~~

Program against interfaces (`PaymentMethod`), not implementations (`CardPayment`), to keep code easy to test and to extend.
@@ java-oop | Interfaces | fr
Une **interface** définit un contrat sans dire comment il est rempli. Une classe peut implémenter plusieurs interfaces.

~~~java
interface PaymentMethod {
    void pay(double amount);
}

class CardPayment implements PaymentMethod {
    public void pay(double amount) { /* débiter la carte */ }
}
~~~

Programmez face à des interfaces (`PaymentMethod`) plutôt qu'à des implémentations (`CardPayment`) pour un code facile à tester et à faire évoluer.
@@ java-oop | ArrayList | en
**ArrayList** is a resizable array — the default choice for lists.

~~~java
List<String> names = new ArrayList<>();
names.add("Amel");
names.add("Karim");
String first = names.get(0);   // O(1)
~~~

- Fast random access (`get`) and fast appends.
- Slow inserts and removals in the middle, because elements must shift.
@@ java-oop | ArrayList | fr
**ArrayList** est un tableau redimensionnable — le choix par défaut pour les listes.

~~~java
List<String> names = new ArrayList<>();
names.add("Amel");
names.add("Karim");
String first = names.get(0);   // O(1)
~~~

- Accès aléatoire (`get`) et ajouts en fin de liste rapides.
- Insertions et suppressions au milieu lentes, car les éléments doivent être décalés.
@@ java-oop | HashSet | en
A **Set** holds unique elements. **HashSet** is the fastest general-purpose set (O(1) on average) but keeps **no order**.

~~~java
Set<String> cities = new HashSet<>(List.of("Tunis", "Sfax", "Tunis"));
System.out.println(cities.size());   // 2 — the duplicate is ignored
~~~

Use **LinkedHashSet** to keep insertion order and **TreeSet** to keep elements sorted.
@@ java-oop | HashSet | fr
Un **Set** contient des éléments uniques. **HashSet** est l'ensemble généraliste le plus rapide (O(1) en moyenne) mais ne garantit **aucun ordre**.

~~~java
Set<String> cities = new HashSet<>(List.of("Tunis", "Sfax", "Tunis"));
System.out.println(cities.size());   // 2 — le doublon est ignoré
~~~

Utilisez **LinkedHashSet** pour conserver l'ordre d'insertion et **TreeSet** pour garder les éléments triés.
@@ java-oop | HashMap | en
A **Map** stores key → value pairs. **HashMap** offers O(1) average lookups with no ordering guarantee.

~~~java
Map<String, Integer> stock = new HashMap<>();
stock.put("laptop", 12);
stock.merge("laptop", 3, Integer::sum);       // 15
int qty = stock.getOrDefault("phone", 0);     // 0
~~~

Keys need a correct `equals()` and `hashCode()`.
@@ java-oop | HashMap | fr
Une **Map** stocke des paires clé → valeur. **HashMap** offre des recherches en O(1) en moyenne, sans garantie d'ordre.

~~~java
Map<String, Integer> stock = new HashMap<>();
stock.put("laptop", 12);
stock.merge("laptop", 3, Integer::sum);       // 15
int qty = stock.getOrDefault("phone", 0);     // 0
~~~

Les clés doivent avoir des méthodes `equals()` et `hashCode()` correctes.
@@ java-oop | Choosing the right collection | en
Pick the structure from the *need*, not from habit.

| Need | Choose | Why |
|---|---|---|
| Ordered list, fast reads | ArrayList | Array-backed, O(1) `get` |
| Many add/remove operations at both ends | LinkedList or ArrayDeque | O(1) at the ends |
| Unique items, fastest | HashSet | O(1) on average |
| Unique items, insertion order | LinkedHashSet | HashSet plus a linked order |
| Unique items, always sorted | TreeSet | Balanced tree, O(log n) |
| Key → value, fastest | HashMap | O(1) on average |
| Key → value, insertion order | LinkedHashMap | Predictable iteration (caches, reports) |
| Key → value, sorted by key | TreeMap | Range queries, O(log n) |

Default to **ArrayList**, **HashSet** and **HashMap**; switch only when you need ordering or sorting.
@@ java-oop | Choosing the right collection | fr
Choisissez la structure selon le *besoin*, pas par habitude.

| Besoin | Choix | Pourquoi |
|---|---|---|
| Liste ordonnée, lectures rapides | ArrayList | Tableau sous-jacent, `get` en O(1) |
| Nombreux ajouts/suppressions aux deux extrémités | LinkedList ou ArrayDeque | O(1) aux extrémités |
| Éléments uniques, le plus rapide | HashSet | O(1) en moyenne |
| Éléments uniques, ordre d'insertion | LinkedHashSet | HashSet plus un chaînage ordonné |
| Éléments uniques, toujours triés | TreeSet | Arbre équilibré, O(log n) |
| Clé → valeur, le plus rapide | HashMap | O(1) en moyenne |
| Clé → valeur, ordre d'insertion | LinkedHashMap | Itération prévisible (caches, rapports) |
| Clé → valeur, triée par clé | TreeMap | Requêtes par intervalle, O(log n) |

Prenez **ArrayList**, **HashSet** et **HashMap** par défaut ; ne changez que lorsque l'ordre ou le tri sont nécessaires.
@@ java-oop | filter | en
`filter` keeps only the elements that match a condition.

~~~java
List<Product> affordable = products.stream()
        .filter(p -> p.price() < 50)
        .toList();
~~~

Streams are **lazy**: nothing runs until a terminal operation (`toList`, `collect`, `forEach`…) is called.
@@ java-oop | filter | fr
`filter` ne conserve que les éléments qui satisfont une condition.

~~~java
List<Product> affordable = products.stream()
        .filter(p -> p.price() < 50)
        .toList();
~~~

Les streams sont **paresseux** : rien ne s'exécute tant qu'une opération terminale (`toList`, `collect`, `forEach`…) n'est pas appelée.
@@ java-oop | map | en
`map` transforms each element into another value.

~~~java
List<String> names = students.stream()
        .map(Student::fullName)
        .sorted()
        .toList();
~~~

The type can change: a `Stream<Student>` becomes a `Stream<String>`.
@@ java-oop | map | fr
`map` transforme chaque élément en une autre valeur.

~~~java
List<String> names = students.stream()
        .map(Student::fullName)
        .sorted()
        .toList();
~~~

Le type peut changer : un `Stream<Student>` devient un `Stream<String>`.
@@ java-oop | collect | en
`collect` gathers a stream into a collection or a summary.

~~~java
Map<String, List<Student>> byCity = students.stream()
        .collect(Collectors.groupingBy(Student::city));

double average = students.stream()
        .collect(Collectors.averagingDouble(Student::grade));
~~~
@@ java-oop | collect | fr
`collect` rassemble un stream dans une collection ou une synthèse.

~~~java
Map<String, List<Student>> byCity = students.stream()
        .collect(Collectors.groupingBy(Student::city));

double average = students.stream()
        .collect(Collectors.averagingDouble(Student::grade));
~~~
@@ java-oop | reduce | en
`reduce` folds all the elements into a single value.

~~~java
double total = orders.stream()
        .map(Order::amount)
        .reduce(0.0, Double::sum);
~~~

For sums, averages and counts, the dedicated collectors (`summingDouble`, `counting`) are often clearer.
@@ java-oop | reduce | fr
`reduce` combine tous les éléments en une seule valeur.

~~~java
double total = orders.stream()
        .map(Order::amount)
        .reduce(0.0, Double::sum);
~~~

Pour les sommes, moyennes et comptages, les collecteurs dédiés (`summingDouble`, `counting`) sont souvent plus lisibles.
@@ java-oop | Optional | en
`Optional<T>` makes "maybe no value" explicit instead of returning `null`.

~~~java
Optional<Student> best = students.stream()
        .max(Comparator.comparingDouble(Student::grade));

String label = best.map(Student::fullName).orElse("No students");
~~~

Avoid calling `get()` without checking. Prefer `map`, `orElse`, `orElseThrow` and `ifPresent`.
@@ java-oop | Optional | fr
`Optional<T>` rend explicite le « peut-être aucune valeur » au lieu de renvoyer `null`.

~~~java
Optional<Student> best = students.stream()
        .max(Comparator.comparingDouble(Student::grade));

String label = best.map(Student::fullName).orElse("Aucun étudiant");
~~~

Évitez d'appeler `get()` sans vérification. Préférez `map`, `orElse`, `orElseThrow` et `ifPresent`.
@@ java-oop | Project brief | en
You will build a **Library Management** console application that puts the whole course to work.

**Requirements**
- Classes `Book`, `Member`, `Loan` and `Library`, encapsulated, with interfaces where they help.
- Books in a `Map<String, Book>` (ISBN → book) and members in a `List<Member>`.
- **Streams** for reports: overdue loans, most borrowed authors, availability by category.
- Input validation and **custom exceptions** such as `BookNotAvailableException`.
- Short methods, meaningful names and unit tests for the core rules.

You deliver a Git repository with a README that explains your design choices.
@@ java-oop | Project brief | fr
Vous allez construire une application console de **gestion de bibliothèque** qui met en œuvre l'ensemble du cours.

**Exigences**
- Classes `Book`, `Member`, `Loan` et `Library`, encapsulées, avec des interfaces là où elles sont utiles.
- Livres dans une `Map<String, Book>` (ISBN → livre) et membres dans une `List<Member>`.
- **Streams** pour les rapports : prêts en retard, auteurs les plus empruntés, disponibilité par catégorie.
- Validation des saisies et **exceptions personnalisées** comme `BookNotAvailableException`.
- Méthodes courtes, noms parlants et tests unitaires pour les règles essentielles.

Vous livrez un dépôt Git avec un README expliquant vos choix de conception.
