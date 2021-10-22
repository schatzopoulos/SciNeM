import axios from 'axios';

import { REQUEST, SUCCESS, FAILURE } from 'app/shared/reducers/action-type.util';
import _ from 'lodash';
import { metapathToString, getMetapathEntities } from '../../shared/util/metapath-utils';
import { generateGroupsOfDisjunctions, constraintsSummary } from 'app/shared/util/constraint-utils';

const analysisAPIUrl = 'api/analysis';

export const ACTION_TYPES = {
  ANALYSIS_SUBMIT: 'analysis/SUBMIT',
  GET_STATUS: 'analysis/GET_STATUS',
  GET_RESULTS: 'analysis/GET_RESULTS',
  GET_MORE_RESULTS: 'analysis/GET_MORE_RESULTS'
};

const initialState = {
  loading: false as boolean,
  progress: 0 as number,
  progressMsg: null as string,
  description: null as string,
  error: null as string,
  uuid: null as string,
  analysis: null as string,
  results: null as any,
  status: null as any
};

export type AnalysisState = Readonly<typeof initialState>;

// Reducer
export default (state: AnalysisState = initialState, action): AnalysisState => {
  switch (action.type) {
    case REQUEST(ACTION_TYPES.ANALYSIS_SUBMIT):
      return {
        ...state,
        loading: true,
        progress: 0,
        progressMsg: null,
        description: null,
        error: null,
        uuid: null,
        analysis: null,
        results: {},
        status: null
      };
    case REQUEST(ACTION_TYPES.GET_STATUS):
    case REQUEST(ACTION_TYPES.GET_RESULTS):
    case REQUEST(ACTION_TYPES.GET_MORE_RESULTS):
      return state;

    case FAILURE(ACTION_TYPES.GET_STATUS):
    case FAILURE(ACTION_TYPES.ANALYSIS_SUBMIT):
    case FAILURE(ACTION_TYPES.GET_RESULTS):
    case FAILURE(ACTION_TYPES.GET_MORE_RESULTS): {
      const errorMsg = 'An unexpected error occurred during the analysis';
      return {
        ...state,
        loading: false,
        progress: 0,
        progressMsg: null,
        description: null,
        error: errorMsg,
        analysis: null,
        results: {}
      };
    }
    case SUCCESS(ACTION_TYPES.ANALYSIS_SUBMIT): {
      return {
        ...state,
        error: null,
        uuid: action.payload.data.id,
        analysis: action.payload.data.analysis
      };
    }
    case SUCCESS(ACTION_TYPES.GET_STATUS): {
      const data = action.payload.data;

      return {
        ...state,
        loading: Object.values(data.completed).some(v => v === false), // when all analysis tasks have been completed
        status: data.completed,
        progress: data.progress,
        progressMsg: `${data.stage}: ${data.step}`,
        description: data.description,
        error: null
      };
    }
    case SUCCESS(ACTION_TYPES.GET_RESULTS): {
      const data = action.payload.data;
      const results = { ...state.results };
      const indexedDocs = _.map(data.docs, (doc, resultIndex) => {
        return { ...doc, resultIndex };
      });
      results[data.analysis] = {
        docs: indexedDocs,
        meta: data._meta,
        hin: data.hin || null
      };

      return {
        ...state,
        error: null,
        results
      };
    }
    case SUCCESS(ACTION_TYPES.GET_MORE_RESULTS): {
      const data = action.payload.data;

      const results = { ...state.results };
      const existingDocs = results[data.analysis]['docs'];
      const indexedDocs = _.map(data.docs, (doc, resultIndex) => {
        return { ...doc, resultIndex: existingDocs.length + resultIndex };
      });
      const meta = data._meta;

      // merge old with new community details
      if (_.get(results[data.analysis], 'meta.community_counts') && _.get(data, '_meta.community_counts')) {
        meta['community_counts'] = { ...results[data.analysis].meta.community_counts, ...data._meta.community_counts };
      }

      results[data.analysis] = {
        docs: [...existingDocs, ...indexedDocs],
        meta
      };

      return {
        ...state,
        error: null,
        results
      };
    }
    default:
      return state;
  }
};

// Actions
function formatConstraints(constraints) {
  const payload = {};

  _.forOwn(constraints, (entityConstraint, entity) => {
    const e = entity.substr(0, 1);
    let entityConditions = [];

    _.forOwn(entityConstraint, ({ enabled, type, conditions }, field) => {
      if (enabled) {
        entityConditions = conditions
          .filter(element => element.value)
          .map(element => {
            let value;
            if (type === 'numeric') {
              value = parseInt(element.value, 10);
            } else {
              value = `'${element.value}'`;
            }
            return `${element.logicOp || ''} ${field} ${element.operation} ${value}`;
          });
      }

      if (entityConditions.length > 0) {
        let strConditions = entityConditions.join(' ');
        // if conditions starts with or || and, then remove it
        if (strConditions.startsWith('or') || strConditions.startsWith('and')) {
          strConditions = strConditions.substr(strConditions.indexOf(' ') + 1);
        }
        payload[e] = strConditions;
      }
    });
  });
  return payload;
}

function getConstraintsExpression(constraints) {
  const constaintDescriptions = {};

  Object.keys(constraints).forEach(entity => {
    constaintDescriptions[entity] = generateGroupsOfDisjunctions(constraints[entity], `${entity}.`);
    console.warn(constaintDescriptions[entity]);
  });

  return constraintsSummary(constaintDescriptions);
}

function getJoinPath(metapathStr) {
  const midPos = Math.floor(metapathStr.length / 2) + 1;
  return metapathStr.substr(0, midPos);
}

function formatQueries(queries) {
  return queries.map(({ metapath, constraints }) => {
    const metapathStr = metapathToString(metapath);
    return {
      metapath: metapathStr,
      entities: getMetapathEntities(metapath),
      joinpath: getJoinPath(metapathStr),
      constraints: formatConstraints(constraints),
      constraintsExpression: getConstraintsExpression(constraints)
    };
  });
}

export const getStatus = id => {
  return {
    type: ACTION_TYPES.GET_STATUS,
    payload: axios.get(`${analysisAPIUrl}/status`, {
      params: {
        id
      }
    })
  };
};

export const getResults = (analysis, id) => {
  return {
    type: ACTION_TYPES.GET_RESULTS,
    payload: axios.get(`${analysisAPIUrl}/get`, {
      params: {
        id,
        analysis
      }
    })
  };
};

export const getMoreResults = (analysis, id, page) => {
  return {
    type: ACTION_TYPES.GET_MORE_RESULTS,
    payload: axios.get(`${analysisAPIUrl}/get`, {
      params: {
        id,
        analysis,
        page
      }
    })
  };
};

export const analysisRun = (
  analysis,
  queries,
  primaryEntity,
  dataset,
  selectField,
  targetId,
  edgesThreshold,
  prTol,
  prAlpha,
  simMinValues,
  searchK,
  hashTables,
  commAlgorithm,
  commThreshold,
  commStopCriterion,
  commMaxSteps,
  commNumOfCommunities,
  commRatio
) => {
  const payload = {
    searchK,
    // constraintsExpression,
    primaryEntity,
    t: hashTables,
    minValues: 5,
    targetId,
    analysis,
    dataset,
    selectField,
    edgesThreshold,
    prAlpha,
    prTol,
    simMinValues,
    commAlgorithm,
    commThreshold,
    commStopCriterion,
    commMaxSteps,
    commNumOfCommunities,
    commRatio
  };

  payload['queries'] = formatQueries(queries);
  // console.warn(JSON.stringify(payload));

  return {
    type: ACTION_TYPES.ANALYSIS_SUBMIT,
    payload: axios.post(`${analysisAPIUrl}/submit`, payload)
  };
};
