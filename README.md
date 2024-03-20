# json-diff-ts-cjs
Forked from: [json-dif-ts](https://github.com/ltwlf/json-diff-ts.git) and compiled to CommonJS;

## Installation

```sh
npm install json-diff-ts-cjs
```

## Capabilities

### `diff`

Generates a difference set for JSON objects. When comparing arrays, if a specific key is provided, differences are determined by matching elements via this key rather than array indices.

#### Examples using Star Wars data:

```javascript
import { diff } from 'json-diff-ts';

const oldData = {
  planet: 'Tatooine',
  faction: 'Jedi',
  characters: [
    { id: 'LUK', name: 'Luke Skywalker', force: true },
    { id: 'LEI', name: 'Leia Organa', force: true }
  ],
  weapons: ['Lightsaber', 'Blaster']
};

const newData = {
  planet: 'Alderaan',
  faction: 'Rebel Alliance',
  characters: [
    { id: 'LUK', name: 'Luke Skywalker', force: true, rank: 'Commander' },
    { id: 'HAN', name: 'Han Solo', force: false }
  ],
  weapons: ['Lightsaber', 'Blaster', 'Bowcaster']
};

const diffs = diff(oldData, newData, { characters: 'id' });

const expectedDiffs = [
  {
    type: 'UPDATE',
    key: 'planet',
    value: 'Alderaan',
    oldValue: 'Tatooine'
  },
  {
    type: 'UPDATE',
    key: 'faction',
    value: 'Rebel Alliance',
    oldValue: 'Jedi'
  },
  {
    type: 'UPDATE',
    key: 'characters',
    embeddedKey: 'id',
    changes: [
      {
        type: 'UPDATE',
        key: 'LUK',
        changes: [
          {
            type: 'ADD',
            key: 'rank',
            value: 'Commander'
          }
        ]
      },
      {
        type: 'ADD',
        key: 'HAN',
        value: {
          id: 'HAN',
          name: 'Han Solo',
          force: false
        }
      },
      {
        type: 'REMOVE',
        key: 'LEI',
        value: {
          id: 'LEI',
          name: 'Leia Organa',
          force: true
        }
      }
    ]
  },
  {
    type: 'UPDATE',
    key: 'weapons',
    embeddedKey: '$index',
    changes: [
      {
        type: 'ADD',
        key: '2',
        value: 'Bowcaster'
      }
    ]
  }
];
```

#### Advanced

Paths can be utilized to identify keys within nested arrays.

```javascript
const diffs = diff(oldData, newData, { 'characters.subarray': 'id' });
```

You can also designate the root by using '.' instead of an empty string ('').

```javascript
const diffs = diff(oldData, newData, { '.characters.subarray': 'id' });
```

You can use a function to dynamically resolve the key of the object.
The first parameter is the object and the second is to signal if the function should return the key name instead of the value. This is needed to flatten the changeset

```javascript
const diffs = diff(oldData, newData, {
  characters: (obj, shouldReturnKeyName) => (shouldReturnKeyName ? 'id' : obj.id)
});
```

If you're using the Map type, you can employ regular expressions for path identification.

```javascript
const embeddedObjKeys: EmbeddedObjKeysMapType = new Map();

embeddedObjKeys.set(/^char\w+$/, 'id'); // instead of 'id' you can specify a function

const diffs = diff(oldObj, newObj, embeddedObjKeys);
```

Compare string arrays by value instead of index

```javascript
const diffs = diff(oldObj, newObj, { stringArr: '$value' });
```

### `flattenChangeset`

Transforms a complex changeset into a flat list of atomic changes, each describable by a JSONPath.

#### Examples:

```javascript
const flatChanges = flattenChangeset(diffs);
// Restore the changeset from a selection of flat changes
const changeset = unflattenChanges(flatChanges.slice(0, 3));
// Alternatively, apply the changes using a JSONPath-capable library
// ...
```

A **flatChange** will have the following structure:

```javascript
[
  { type: 'UPDATE', key: 'planet', value: 'Alderaan', oldValue: 'Tatooine', path: '$.planet', valueType: 'String' },
  // ... Additional flat changes here
  { type: 'ADD', key: 'rank', value: 'Commander', path: "$.characters[?(@.id=='LUK')].rank", valueType: 'String' }
];
```

### `applyChange`

#### Examples:

```javascript
const oldData = {
  // ... Initial data here
};

// Sample diffs array, similar to the one generated in the diff example
const diffs = [
  // ... Diff objects here
];

changesets.applyChanges(oldData, diffs);

expect(oldData).to.eql({
  // ... Updated data here
});
```

### `revertChange`

#### Examples:

```javascript
const newData = {
  // ... Updated data here
};

// Sample diffs array
const diffs = [
  // ... Diff objects here
];

changesets.revertChanges(newData, diffs);

expect(newData).to.eql({
  // ... Original data restored here
});
```

### `jsonPath`

The `json-diff-ts` library uses JSONPath to address specific parts of a JSON document in both the changeset and the application/reversion of changes.

#### Examples:

```javascript

const jsonPath = changesets.jsonPath;

cost data = {
  // ... Some JSON data
};

const value = jsonPath.query(data, '$.characters[?(@.id=="LUK")].name');

expect(value).to.eql(['Luke Skywalker']);
```

## Acknowledgments
Forked from:  [json-dif-ts](https://github.com/ltwlf/json-diff-ts.git)
- LinkedIn: [Christian Glessner](https://www.linkedin.com/in/christian-glessner/)
- Twitter: [@leitwolf_io](https://twitter.com/leitwolf_io)

This project takes inspiration and code from [diff-json](https://www.npmjs.com/package/diff-json) by viruschidai@gmail.com.

## License

json-diff-ts is open-sourced software licensed under the [MIT license](LICENSE).

The original diff-json project is also under the MIT License. For more information, refer to its [license details](https://www.npmjs.com/package/diff-json#license).
