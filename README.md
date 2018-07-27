# Sqorn

![version](https://img.shields.io/npm/v/sqorn.svg)
![build status](https://img.shields.io/travis/eejdoowad/sqorn.svg)

Sqorn is a SQL query builder designed to make querying your database a joy. It uses tagged template literals and promises to provide a concise yet powerful API. Sqorn makes queries short, structured, and intuitive without sacrificing the flexibility of SQL.

**Sqorn is in early development. The API is subject to change and certain methods may not work. Contributors welcome.**

# Index

* [Install](#install)
* [Tutorial](#tutorial)
* [API](#api)
* [Roadmap](#roadmap)

## Install

```sh
npm install --save sqorn
npm install --save pg # postgres is only database currently supported
```

## Tutorial

### Initialize

```javascript
const sqorn = require('sqorn')
const sq = sqorn({ client: 'pg', connection: {} })
```

`sqorn` is the function that initializes and returns a query builder with the provided configuration.

`sq` is an object with methods used to build and compile SQL queries.


### Raw Query


```sql
select * from person
```

```javascript
sq.l`select * from person`
```

`sq.l` creates a single complete escaped SQL query.

### Select

```sql
select * from book
```

```javascript
sq.frm`book`
  .ret`*`
// or
sq`book`
```

`.frm` specifies the table to query and `.ret` specifies the selected columns. If `.ret` isn't called, select queries implicitly request all columns (`*`).

Using `sq` as a template literal tag is shorthand for calling `.frm`.

### Where

```sql
select age, job from person where first_name = 'Kaladin'
```

```javascript
sq.frm`person`
  .whr`first_name = ${'Kaladin'}`
  .ret`age, job`
// or
sq`person``first_name = ${'Kaladin'}``age, job`
```

`.whr` specifies the `where` clause, which filters result rows. 

All methods of `sq` escape template literal arguments, except when noted otherwise.


### Where Object

```javascript
sq.frm`book`
  .whr({ publishYear: 1984 })
// or
sq`book`({ publishYear: 1984 })
```

`.whr` also accepts object arguments. By default `sq` converts method arguments of type `Object` from `CamelCase` to `snake_case`.


### Where Compound

```sql
select * from book
where not (title = 'Oathbringer')
or (pages >= 200 and genre = 'fantasy')
```

```javascript
const title = 'Oathbringer', minPages = 200, genre = 'fantasy'

sq.frm`book`
  .whr`not (title = ${title})`
  .whr`or (pages >= ${minPages} and genre = ${genre})`
// or
sq`book`(
    sq.not({ title }),
    { minPages: sq.l`pages >= ${minPages}`, genre }
  )
// or
sq.frm`book`
  .whr(sq.not({ title }))
  .whr`or`
  .whr({ minPages: sq.l`pages >= ${minPages}`, genre })
// or
sq`book`(
  sq.or(
    sq.not(sq.op`=`('title', title))
    sq.and(
      sq.op`>=`('pages', minPages)
      sq.l`genre = ${genre}`,
    )
  )
```

**NOTE: SQL query strings generated from the calls above, though logically equivalent, may have varying parantheses and spacing.**

Conditions generated from multiple calls to `.whr` are joined with the `new line` character (`\n`).

`.whr` converts each object argument to the logical conjunction (`AND`) of the conditions represented by its properties.

`.whr` uses logical disjunction (`OR`) to join the conditions represented by each object argument.

`.not` negates one argument, `.and` conjuncts two arguments, and `.or` disjuncts two arguments.

`.op` takes a template literaly naming a binary operator and returns a function that applies the operator to its two arguments.

### and

```javascript
const author = 'Moby Dick'
const language = 'English'

q`book`.where`author = ${author} and language = ${language}`.all
// or
q`book`.where({ author, language }).all
```

```sql
select * from `books` where author = 'Moby Dick' and language = 'English'
```

### or

```javascript
const author = 'Moby Dick'
const language = 'English'
const year = 1984

q`book`.where`author = ${author} or (language = ${language} and year != ${year})`.all
// or
q`book`.where({ author }, { language, year: q.not(year) }).all
// or
q`book`.where(q.or({ author }, q.and({ language }, q.not({ year }))).all
// note
```



```sql
select * from `books` where author = 'Moby Dick' or language = 'English'
```
### manual conditions

```javascript
const minYear = 1800
const maxYear = 1984

q`book`.fil`year >= ${minYear} and year <= ${maxYear} `.all
// or
q`book`where({
  min: q.c`year >= ${minYear}`,
  max: q.c`year <= ${maxYear}`
}).all
```

```sql
select * from book where year >= 1800 and year <= 1984
```

### insert

```javascript
sq`person`
  .ins({ firstName, lastName, age })
  .one`id`
// insert into person (first_name, last_name, age)
// values ('John', 'Doe', 40) returning id
sq`person`
  .ins`first_name, last_name`
  `upper(${firstName}), upper(${lastName})`
  .run
// insert into person (first_name, lastName)
// values (upper('John'), upper('Doe'))
```

### insert multiple


```javascript
const people = [{ age: 13 }, { age: null, lastName: 'jo' }, { age: 23, lastName: 'smith' }]
sq`person`
  .ins(...people)
  .all`id`
// insert into person (age, last_name)
// values (13, DEFAULT), (NULL, 'jo'), (23, 'smith') returning id
sq`person`
  .ins`last_name`
  (people, person => sq.l`upper(${person.lastName})`)
  .run
// insert into person (lastName)
// values (upper(), upper('Doe'))
sq`person`
  .ins`first_name`
  `upper(${people[0].firstName})`
  `upper(${people[1].firstName})`
  `upper(${people[2].firstName})`
  .run
// insert into person (first_name, lastName)
// values(upper('John'), upper('Doe'))
let insert = sq`person`.ins`first_name`
people.forEach(person => { insert = insert`upper(${person.firstName})` })
insert.run
```

## update

```javascript
const age = 23
const increment = 2
sq`person`({ age })`count(*)`
  .upd({ age: sq.l`age + ${increment}`, updateTime: sq.l`now()`})
// or
sq.frm`person`
  .whr`age = ${age}`
  .upd`age = age + ${increment}, update_time = now()`
  .ret`count(*)
```

```sql
update person set age = 24 where age = 23 returning count(*)
```

## upsert (insert conflict)



```sql
update person
set age = 23, first_name = 'bob'
where 
```

```javascript

```

### subquery

```javascript
q`author`.where`author_id in ${
  q`book`.where`year < 1984`.ret`author_id`
}`.run
```

```sql
select * from author where author_id in (
  select author_id from book where year < 1984
)
```

### join

```javascript
sq`person p join company c on p.employer_id = c.id``p.id = ${23}``c.name`

sq.inj`p.employer_id = c.id`(`person p`, `company c`))`p.id = ${23}``c.name`
```

```sql

```

### in, not in

```javascript

```

```sql

```


### with

```sql
with `with_alias` as (
  select * from "book" where "author" = 'Moby Dick'
)
select * from `with_alias`
```

```javascript
q`book`
q()`book`.all`title, author, year`
```

### group by

```sql
select age, count(*) from person group by age
```

```javascript
sq`person`()`age, count(*)`.grp`age`
```

### having

```sql
select age, count(*) count from person group by age having age < 18
```

```javascript
sq`person`()`age, count(*) count`.grp`age``age < 18`
```

### order by

```sql
select * from person order by last_name, first_name
```

```javascript
sq`person`.ord`last_name, first_name`
```

### limit

```sql
select * from person order by last_name limit 10 offset 7
```

```javascript
sq`person`.ord`last_name, first_name`.lim(10).off(7)
```

### offset

### transactions

```javascript
await sq.trx(async trx => {
  const created = await createSecret({ expires: '24 hours', type: 'code' }).one(trx)
  const queried = await getSecret({ secret: created.secret }).one(trx)
  const deleted = await deleteSecret({ secret: queried.secret }).one(trx)
})

```

### complex query examples


### create table

TODO: REVISE: EXPERIMENTAL

```javascript
const person = sq
  .tbl`person`
  .col`id`                     `serial`
                               .pk
  .col`first_name`             `text not null`
                               .idx
  .col`last_name`              `text not null`
  .col`age`                    `integer`
                               .chk`age >= 0`
  .col`mother`                 `integer`
                               .del`cascade`
                               .fk `person(id)`
  .col`father`                 `integer`
  .fk `mother`                 `person(id)`
  .chk`first_name`             `char_length(first_name) <= 320)`
  .unq`first_name, last_name, age`
  .idx`last_name`
```



## API

### shared

#### wth

#### frm

#### whr

#### ret



### select

#### grp

#### hav

#### ord

#### lim

#### off



### delete

#### del



### insert

#### ins

#### val

### update

#### upd



### execute

#### trx: async (callback: async (trx: Transaction) => any) => any

__Description:__

  Runs the asynchronous callback function in the context of a transaction. A `Transaction` object `trx` is made available to the callback and should be passed to all queries that are part of the transaction.

__Returns:__

  the value return by the callback

#### str: () => string

__Description:__

  builds a SQL query string representing the current context

__Returns:__

  a SQL query string representation of the current context

#### run: async (trx?: Transaction) => void

__Description:__

  executes the query

__Returns:__

  a promise that resolves when the query is done

#### one: async (trx?: Transaction) => any

__Description:__

  executes the query

__Returns:__

  a promise for the first row returned by the query or `undefined` if no rows were returned

#### all: async (trx?: Transaction) => any[]

__Description:__

  Executes the query

__Returns:__

  a promise for an array of results (which may have length 0)

#### exs: async (trx?: Transaction) => boolean

__Description:__

  executes the query

__Returns:__

  a promise that resolves to true if at least one row was returned by the query, false otherwise

### Where operators

#### and

#### or

#### not



### join

#### .inj

#### .ouj

#### .lij

#### .loj

#### .rij

#### .roj

#### .naj

## Style Guide

```javascript
const firstName = 'John', lastName = 'Doe', age = 40, order = 'DESC'
sq`person`
// select * from person
sq`person`({ firstName })
// select * from person where first_name = 'John'
sq`person``age > ${age}``first_name`
// select first_name from person where age > 40
sq`person``id`.ins({ firstName, lastName, age })
// insert into person (first_name, last_name, age)
// values ('John', 'Doe', 40) returning id
sq`person``id`
  .ins`first_name, last_name``upper(${firstName}), upper(${lastName})`
// insert into person (first_name, lastName)
// values(upper('John'), upper('Doe')) returning id
sq`person`({ age })`id`.del
// delete from person where age = 40 returning id
sq`person``age < ${age}`.del
// delete from person where age < 40
sq`person p join company c on p.employer_id = c.id`
  `p.id = ${23}``c.name`
// select c.name from person p join company c on p.employer_id = c.id
// where p.id = 23
sq.wit`children`(sq`person``age < ${18}`)`children`()`first_name`
// with children as (select * from "person" where age < 18)
// select first_name from children`
sq.l`name = ${firstName}`
// name = 'John' -- builds escaped SQL string
sq.ary`order by name ${order}`
// order by name DESC -- builds unescaped SQL string
const colors = sq.ret`'red', 'yellow','blue'`
sq`${colors} c`
// select * from (select 'red', 'yellow', 'blue') c
```


```javascript
const firstName = 'John', lastName = 'Doe', age = 40, order = 'DESC'
sq.frm`person`
  .ret`*`
// select * from person
sq.frm`person`
  .whr({ firstName })
// select * from person
// where first_name = 'John'
sq.frm`person`
  .whr`age > ${age}`
  .ret`first_name`
// select first_name
// from person
// where age > 40
sq.frm`person`
  .ins({ firstName, lastName, age }
  .ret`id`
// insert into person (first_name, last_name, age)
// values ('John', 'Doe', 40)
// returning id
sq.frm`person`
  .col`first_name, last_name`
  .ins`upper(${firstName}), upper(${lastName})`
  .ret`id`
// insert into person (first_name, lastName)
// values(upper('John'), upper('Doe')) returning id
sq.del`person`
  .whr({ age })
  .ret`id`

// delete from person where age = 40 returning id
sq`person``age < ${age}`.del
// delete from person where age < 40
sq`person p join company c on p.employer_id = c.id`
  `p.id = ${23}``c.name`
// select c.name from person p join company c on p.employer_id = c.id
// where p.id = 23
sq.wit`children`(sq`person``age < ${18}`)`children`()`first_name`
// with children as (select * from "person" where age < 18)
// select first_name from children`
sq.l`name = ${firstName}`
// name = 'John' -- builds escaped SQL string
sq.ary`order by name ${order}`
// order by name DESC -- builds unescaped SQL string
```

## FAQ

### How does sqorn work?

When a method on the query builder `sq` is called, it pushes an object containing the method name and arguments to an array named `methods`.

```javascript
sq.frm`person`.whr`age > ${7} and age < ${13}`.ret`name`
// methods ===
[ { type: 'frm', args: [ [ 'person' ] ] },
  { type: 'whr', args: [ [ 'age > ', ' and age < ', '' ], 7, 13 ] },
  { type: 'ret', args: [ [ '5' ] ] } ]

```

Certain methods like `.run` trigger the three-step compilation process:

First, the entries in `methods` are processed sequentially to build a context object `ctx`.

```javascript
// ctx === context(methods) ===
{ type: 'select',
  frm: [ [ 'person' ] ],
  whr: [ [ 'age > ', ' and age < ', '' ], 7, 13 ],
  ret: [ [ '5' ] ] }
```

Second, a `Query` of type `ctx.type` is constructed. Each `Query` is constructed from a sequence of `clauses`, which are evaluated against `ctx`. Each clause returns an object with properties `txt` for its text component and `arg` for its parameterized arguments.

```javascript
select = Query(ctx)(
  With,   // undefined
  Select, // { txt: 'select age', arg: [] }
  From,   // { txt: 'from person', arg: []}
  Where,  // { txt: 'where age > $1 and age < $2, arg: [7, 13] }
  Group,  // undefined
  Having, // undefined
  Order,  // undefined
  Limit,  // undefined
  Offset  // undefined
)
```

Finally, the contributions of all clauses are joined together to construct a complete query object. This query object is passed to the underlying database library for execution.

```javascript
{ txt: 'select age from person where age > $1 and age < $2' 
  arg: [7, 13] }
```

## Roadmap

* integrate pg
* implement execution methods
* support object parameters
* complete implementation
* add query validation
* implement .str (for pg)
* write tests for everything
* table and constain creation / migration
