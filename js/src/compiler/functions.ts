import globalFunctions from '../global-scope/globals';
import moduleFunctions from '../native-modules/modules';
import helperFunctions from './helpers';

export const functions = {
  ...globalFunctions,
  ...moduleFunctions,
  ...helperFunctions,
};

export const traits = {
  ...helperFunctions,
};
