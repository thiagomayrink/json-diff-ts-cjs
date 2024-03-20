import { diff, flattenChangeset, getTypeOfObj, IFlatChange, Operation } from './jsonDiff.js';
const _ = require('lodash');

export enum CompareOperation {
  CONTAINER = 'CONTAINER',
  UNCHANGED = 'UNCHANGED'
}

export interface IComparisonEnrichedNode {
  type: Operation | CompareOperation;
  value: IComparisonEnrichedNode | IComparisonEnrichedNode[] | any | any[];
  oldValue?: any;
}
export interface IEntry {
  key: string;
  value: IComparisonEnrichedNode;
}

export const createValue = (value: any): IComparisonEnrichedNode => ({ type: CompareOperation.UNCHANGED, value });
export const createContainer = (value: object | []): IComparisonEnrichedNode => ({
  type: CompareOperation.CONTAINER,
  value
});

export const enrich = (object: any): IComparisonEnrichedNode => {
  const objectType = getTypeOfObj(object);

  switch (objectType) {
    case 'Object':
      return _.keys(object)
        .map((key: string) => ({ key, value: enrich(object[key]) }))
        .reduce((accumulator: IComparisonEnrichedNode, entry: IEntry) => {
          accumulator.value[entry.key] = entry.value;
          return accumulator;
        }, createContainer({}));
    case 'Array':
      return _.chain(object)
        .map((value: any) => enrich(value))
        .reduce((accumulator: IComparisonEnrichedNode, value: IComparisonEnrichedNode) => {
          accumulator.value.push(value);
          return accumulator;
        }, createContainer([]))
        .value();
    case 'Function':
      return undefined;
    case 'Date':
    default:
      // Primitive value
      return createValue(object);
  }
};

export const applyChangelist = (
  object: IComparisonEnrichedNode,
  changelist: IFlatChange[]
): IComparisonEnrichedNode => {
  _.chain(changelist)
    .map((entry: IFlatChange) => ({ ...entry, path: _.replace(entry.path, '$.', '.') }))
    .map((entry: IFlatChange) => ({
      ...entry,
      path: _.replace(entry.path, /(\[(?<array>\d)\]\.)/g, 'ARRVAL_START$<array>ARRVAL_END')
    }))
    .map((entry: IFlatChange) => ({ ...entry, path: _.replace(entry.path, /(?<dot>\.)/g, '.value$<dot>') }))
    .map((entry: IFlatChange) => ({ ...entry, path: _.replace(entry.path, /\./, '') }))
    .map((entry: IFlatChange) => ({ ...entry, path: _.replace(entry.path, /ARRVAL_START/g, '.value[') }))
    .map((entry: IFlatChange) => ({ ...entry, path: _.replace(entry.path, /ARRVAL_END/g, '].value.') }))
    .value()
    .forEach((entry: IFlatChange) => {
      switch (entry.type) {
        case Operation.ADD:
        case Operation.UPDATE:
          _.set(object, entry.path, { type: entry.type, value: entry.value, oldValue: entry.oldValue });
          break;
        case Operation.REMOVE:
          _.set(object, entry.path, { type: entry.type, value: undefined, oldValue: entry.value });
          break;
        default:
          throw new Error();
      }
    });
  return object;
};

export const compare = (oldObject: any, newObject: any): IComparisonEnrichedNode => {
  return applyChangelist(enrich(oldObject), flattenChangeset(diff(oldObject, newObject)));
};
