type FlowNode = {
  id: string;
  type: string;
  label?: string;
  name?: string;
  data?: Record<string, any>;
  condition?: string;
};

type FlowEdge = {
  source: string;
  target: string;
  condition?: string;
  label?: string;
  data?: Record<string, any>;
};

const literalValue = (raw: string): any => {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? value : numberValue;
};

const getVariableValue = (variables: Record<string, any>, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], variables);
};

const compare = (left: any, operator: string, right: any): boolean => {
  switch (operator) {
    case '==':
    case '===':
      return left === right;
    case '!=':
    case '!==':
      return left !== right;
    case '>':
      return Number(left) > Number(right);
    case '>=':
      return Number(left) >= Number(right);
    case '<':
      return Number(left) < Number(right);
    case '<=':
      return Number(left) <= Number(right);
    case 'contains':
      return String(left ?? '').includes(String(right));
    default:
      return false;
  }
};

export const evaluateCondition = (expression: string | undefined, variables: Record<string, any>): boolean => {
  if (!expression || expression.trim() === '') return true;

  return expression
    .split(/\s+&&\s+/)
    .every((part) => {
      const match = part.trim().match(/^([a-zA-Z_$][\w.$]*)\s*(===|!==|==|!=|>=|<=|>|<|contains)\s*(.+)$/);
      if (!match) return false;

      const [, field, operator, rawValue] = match;
      return compare(getVariableValue(variables, field), operator, literalValue(rawValue));
    });
};

export const parseJsonObject = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const parseJsonArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getNodeName = (node: FlowNode): string => node.label || node.name || node.id;

export const getOutgoingTargets = (
  node: FlowNode,
  edges: FlowEdge[],
  variables: Record<string, any>
): string[] => {
  const outgoingEdges = edges.filter((edge) => edge.source === node.id);

  if (node.type !== 'exclusiveGateway') {
    return outgoingEdges.map((edge) => edge.target);
  }

  const matchedEdges = outgoingEdges.filter((edge) =>
    evaluateCondition(edge.condition || edge.data?.condition || edge.label, variables)
  );

  return matchedEdges.length > 0
    ? matchedEdges.map((edge) => edge.target)
    : outgoingEdges.filter((edge) => !edge.condition && !edge.data?.condition && !edge.label).map((edge) => edge.target);
};

