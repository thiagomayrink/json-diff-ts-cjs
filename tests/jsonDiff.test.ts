import {
  applyChangeset,
  diff,
  EmbeddedObjKeysMapType,
  flattenChangeset,
  IFlatChange,
  revertChangeset,
  unflattenChanges
} from '../src/jsonDiff';
import * as fixtures from './__fixtures__/jsonDiff.fixture';
const _ = require('lodash');

let oldObj: any;
let newObj: any;

beforeEach(() => {
  oldObj = fixtures.oldObj();
  newObj = fixtures.newObj();
});

describe('jsonDiff#diff', () => {
  it('returns correct diff for objects with embedded array without specified key', () => {
    const diffs = diff(oldObj, newObj);
    expect(diffs).toMatchSnapshot();
  });

  it('returns correct diff for objects with embedded array with specified keys', () => {
    const diffs = diff(oldObj, newObj, {
      children: 'name',
      // path can either starts with "" or "."
      '.children.subset': 'id'
    });
    expect(diffs).toMatchSnapshot();
  });

  it('returns correct diff for objects with embedded array with regex keys', () => {
    const embeddedObjKeys: EmbeddedObjKeysMapType = new Map();
    embeddedObjKeys.set(/^children$/, 'name');
    embeddedObjKeys.set(/\.subset$/, 'id');

    const diffs = diff(oldObj, newObj, embeddedObjKeys);
    expect(diffs).toMatchSnapshot();
  });

  it('returns correct diff for objects with embedded array with function keys', () => {
    const diffs = diff(oldObj, newObj, {
      children: (obj: { name: string }) => obj.name,
      'children.subset': (obj: { id: number }) => obj.id
    });
    expect(diffs).toMatchSnapshot();
  });

  it('returns correct diff for object without keys to skip', () => {
    const keyToSkip = '@_index';
    oldObj[keyToSkip] = 'This should be ignored';
    newObj['children'][1][keyToSkip] = { text: 'This whole object should be ignored' };
    const diffs = diff(oldObj, newObj, undefined, [keyToSkip]);
    expect(diffs).toMatchSnapshot();
  });
});

describe('jsonDiff#applyChangeset', () => {
  it('applies changeset to oldObj correctly', () => {
    applyChangeset(oldObj, fixtures.changeset);
    newObj.children.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
    expect(oldObj).toMatchObject(newObj);
  });

  it('applies changesetWithoutKey to oldObj correctly', () => {
    applyChangeset(oldObj, fixtures.changesetWithoutEmbeddedKey);
    expect(_.isEqual(oldObj, newObj)).toBe(true);
  });

  it('ignores removal of non-existing array elements', () => {
    applyChangeset(oldObj, fixtures.changesetWithDoubleRemove);
    newObj.children.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
    expect(oldObj).toMatchObject(newObj);
  });
});

describe('jsonDiff#revertChangeset', () => {
  it('reverts changeset on newObj correctly', () => {
    revertChangeset(newObj, fixtures.changeset);
    expect(_.isEqual(oldObj, newObj)).toBe(true);
  });

  it('reverts changesetWithoutKey on newObj correctly', () => {
    revertChangeset(newObj, fixtures.changesetWithoutEmbeddedKey);
    newObj.children.sort((a: any, b: any) => a.name > b.name);
    expect(_.isEqual(oldObj, newObj)).toBe(true);
  });
});

describe('jsonDiff#flatten', () => {
  it('flattens changes, unflattens them, and applies them correctly', () => {
    const diffs = diff(oldObj, newObj, {
      children: 'name',
      'children.subset': 'id'
    });

    const flat = flattenChangeset(diffs);
    const unflat = unflattenChanges(flat);

    applyChangeset(oldObj, unflat);

    newObj.children.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));
    oldObj.children.sort((a: any, b: any) => (a.name > b.name ? 1 : -1));

    expect(oldObj).toStrictEqual(newObj);
  });

  it('starts with a blank object, flattens changes, unflattens them, and applies them correctly', () => {
    const beforeObj = {};
    const afterObj = newObj;

    const diffs = diff(beforeObj, afterObj, {});

    const flat = flattenChangeset(diffs);
    const unflat = unflattenChanges(flat);

    applyChangeset(beforeObj, unflat);

    expect(beforeObj).toMatchObject(afterObj);
  });

  it('gets key name for flattening when using a key function', () => {
    const beforeObj = {
      items: [
        {
          _id: '1'
        }
      ]
    };

    const afterObj = {
      items: [
        {
          _id: '2'
        }
      ]
    };

    const diffs = diff(beforeObj, afterObj, {
      items: (obj, getKeyName) => {
        if (getKeyName) {
          if (obj?._id) {
            return '_id';
          }
          return '$index';
        }
        if (obj?._id) {
          return obj?._id;
        }
        return '$index';
      }
    });

    const flat = flattenChangeset(diffs);

    expect(flat).toMatchSnapshot();
  });
});

describe('jsonDiff#valueKey', () => {
  let oldObj: any;
  let newObj: any;

  beforeEach(() => {
    oldObj = {
      items: ['apple', 'banana', 'orange']
    };

    newObj = {
      items: ['orange', 'lemon']
    };
  });

  it('tracks array changes by array value', () => {
    const diffs = diff(oldObj, newObj, { items: '$value' });
    expect(diffs).toMatchSnapshot();
  });

  it('corretly flatten array value keys', () => {
    const flattenChanges = flattenChangeset(diff(oldObj, newObj, { items: '$value' }));
    expect(flattenChanges).toMatchSnapshot();
  });

  it('corretly unflatten array value keys', () => {
    const flattenChanges = [
      {
        key: 'lemon',
        path: "$.items[?(@='lemon')]",
        type: 'ADD',
        value: 'lemon',
        valueType: 'String'
      },
      {
        key: 'apple',
        path: "$.items[?(@='apple')]",
        type: 'REMOVE',
        value: 'apple',
        valueType: 'String'
      }
    ] as IFlatChange[];

    const changeset = unflattenChanges(flattenChanges);

    expect(changeset).toMatchSnapshot();
  });

  it('apply array value keys', () => {
    const flattenChanges = [
      {
        key: 'lemon',
        path: "$.items[?(@='lemon')]",
        type: 'ADD',
        value: 'lemon',
        valueType: 'String'
      },
      {
        key: 'apple',
        path: "$.items[?(@='apple')]",
        type: 'REMOVE',
        value: 'apple',
        valueType: 'String'
      }
    ] as IFlatChange[];

    const changeset = unflattenChanges(flattenChanges);

    applyChangeset(oldObj, changeset);

    expect(oldObj).toMatchSnapshot();
  });

  it('revert array value keys', () => {
    const flattenChanges = [
      {
        key: 'banana',
        path: "$.items[?(@='banana')]",
        type: 'ADD',
        value: 'banana',
        valueType: 'String'
      },
      {
        key: 'lemon',
        path: "$.items[?(@='lemon')]",
        type: 'REMOVE',
        value: 'lemon',
        valueType: 'String'
      }
    ] as IFlatChange[];

    const changeset = unflattenChanges(flattenChanges);

    revertChangeset(oldObj, changeset);

    expect(oldObj).toMatchSnapshot();
  });
});
