export const generateGroupsOfDisjunctions = (entityConstraintsObj, fieldPrefix = '') => {
  if (entityConstraintsObj) {
    // Get access to all the fields of the entity
    return Object.keys(entityConstraintsObj)
      .filter(key => key !== 'id' && entityConstraintsObj[key].enabled)
      .map(key => {
        if (entityConstraintsObj[key].conditions.length > 2) {
          const targetConditions = entityConstraintsObj[key].conditions.slice(2);
          let inConjunction = false;
          const formalConditionsSegments = [];
          targetConditions.forEach((conditionObj, index) => {
            const formalConditionObject = {
              field: fieldPrefix + key,
              condition: `${entityConstraintsObj[key].conditions[index + 1].operation}${entityConstraintsObj[key].conditions[index + 1].value}`
            };
            if (inConjunction) {
              formalConditionsSegments[formalConditionsSegments.length - 1].push(formalConditionObject);
            } else {
              formalConditionsSegments.push([formalConditionObject]);
            }
            inConjunction = conditionObj.logicOp === 'and';
          });
          const lastFormalConditionObject = {
            field: fieldPrefix + key,
            condition: `${entityConstraintsObj[key].conditions[entityConstraintsObj[key].conditions.length - 1].operation}${entityConstraintsObj[key].conditions[entityConstraintsObj[key].conditions.length - 1].value}`
          };
          if (inConjunction) {
            formalConditionsSegments[formalConditionsSegments.length - 1].push(lastFormalConditionObject);
          } else {
            formalConditionsSegments.push([lastFormalConditionObject]);
          }
          return formalConditionsSegments;
        } else if (entityConstraintsObj[key].conditions.length === 2) {
          const formalConditionObject = {
            field: fieldPrefix + key,
            condition: `${entityConstraintsObj[key].conditions[1].operation}${entityConstraintsObj[key].conditions[1].value}`
          };
          return [[formalConditionObject]];
        } else {
          return [];
        }
      });
  }
};

export const constraintsSummary = constraintSegments => {
  const constraintExpressions = Object.keys(constraintSegments).map(entity => {
    const entityFields = constraintSegments[entity];
    const fieldExpressions = entityFields.map(field => {
      const disjunctionExpressions = field.map(disjunction => {
        if (disjunction.length > 1) {
          const conjunctionExpressions = disjunction.map(conjunctionElement => {
            return conjunctionElement.field + conjunctionElement.condition;
          });
          if (field.length > 1) {
            return `(${conjunctionExpressions.join(' and ')})`;
          } else {
            return `${conjunctionExpressions.join(' and ')}`;
          }
        } else {
          return disjunction[0].field + disjunction[0].condition;
        }
      });
      return disjunctionExpressions.join(' or ');
    });
    return fieldExpressions.filter(expression => !!expression).join(', ');
  });
  return constraintExpressions.filter(expression => !!expression).join(', ');
};
