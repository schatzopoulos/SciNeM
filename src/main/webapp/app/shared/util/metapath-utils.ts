export const metapathToString = (metapath: any) => {
  return (metapath || []).map(n => n.data('label').substr(0, 1)).join('');
};

export const getMetapathEntities = (metapath: any) => {
  return (metapath || []).map(n => n.data('label'));
};
